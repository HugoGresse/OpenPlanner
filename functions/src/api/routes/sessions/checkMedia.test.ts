import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { Event } from '../../../types'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((_fastify, _options, next) => next()),
        getStorageBucketName: () => 'test-bucket',
    }
})

const eventId = 'evt-1'
const apiKey = 'xxx'

const url = (path = '') => `/v1/${eventId}/check-media${path}?apiKey=${apiKey}`

const mockEventFirestore = (fastify: any) => {
    vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() =>
        getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
    )
}

const makeFetchResponse = (status: number, ok = status >= 200 && status < 300) =>
    ({
        ok,
        status,
        body: { cancel: vi.fn(() => Promise.resolve()) },
    } as unknown as Response)

describe('POST /v1/:eventId/check-media', () => {
    const fastify = setupFastify()
    let fetchSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
        fetchSpy = vi.fn()
        globalThis.fetch = fetchSpy as unknown as typeof fetch
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 without apiKey', async () => {
        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/check-media`,
            payload: { urls: ['https://example.com/a.png'] },
        })
        expect(res.statusCode).toBe(401)
    })

    test('returns 400 when body validation fails', async () => {
        mockEventFirestore(fastify)
        const res = await fastify.inject({
            method: 'POST',
            url: url(),
            payload: { urls: ['not-a-uri'] },
        })
        expect(res.statusCode).toBe(400)
    })

    test('rejects URL list above the cap (101 urls)', async () => {
        mockEventFirestore(fastify)
        const urls = Array.from({ length: 101 }, (_, i) => `https://example.com/${i}.png`)
        const res = await fastify.inject({ method: 'POST', url: url(), payload: { urls } })
        expect(res.statusCode).toBe(400)
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    test('returns ok=true on a 200 HEAD response without falling back to GET', async () => {
        mockEventFirestore(fastify)
        fetchSpy.mockResolvedValueOnce(makeFetchResponse(200))

        const res = await fastify.inject({
            method: 'POST',
            url: url(),
            payload: { urls: ['https://example.com/logo.png'] },
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({
            results: [{ url: 'https://example.com/logo.png', ok: true, status: 200 }],
        })
        expect(fetchSpy).toHaveBeenCalledTimes(1)
        expect(fetchSpy.mock.calls[0][1].method).toBe('HEAD')
    })

    test('falls back to GET only when HEAD returns 405 / 501', async () => {
        mockEventFirestore(fastify)
        fetchSpy.mockResolvedValueOnce(makeFetchResponse(405)).mockResolvedValueOnce(makeFetchResponse(200))

        const res = await fastify.inject({
            method: 'POST',
            url: url(),
            payload: { urls: ['https://example.com/img.png'] },
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body).results[0]).toMatchObject({ ok: true, status: 200 })
        expect(fetchSpy).toHaveBeenCalledTimes(2)
        expect(fetchSpy.mock.calls[1][1].method).toBe('GET')
    })

    test('does not fall back to GET on other 4xx/5xx errors', async () => {
        mockEventFirestore(fastify)
        fetchSpy.mockResolvedValueOnce(makeFetchResponse(404))

        const res = await fastify.inject({
            method: 'POST',
            url: url(),
            payload: { urls: ['https://example.com/missing.png'] },
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body).results[0]).toMatchObject({ ok: false, status: 404 })
        expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    test('reports the fetch error message when the request throws', async () => {
        mockEventFirestore(fastify)
        fetchSpy.mockRejectedValueOnce(new Error('boom'))

        const res = await fastify.inject({
            method: 'POST',
            url: url(),
            payload: { urls: ['https://example.com/x.png'] },
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body).results[0]).toMatchObject({ ok: false, error: 'boom' })
    })

    test('blocks loopback host without performing any fetch', async () => {
        mockEventFirestore(fastify)
        const res = await fastify.inject({
            method: 'POST',
            url: url(),
            payload: { urls: ['http://localhost/secret'] },
        })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body).results[0]).toMatchObject({
            ok: false,
            error: 'Private or loopback host blocked',
        })
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    test('blocks GCP metadata host without performing any fetch', async () => {
        mockEventFirestore(fastify)
        const res = await fastify.inject({
            method: 'POST',
            url: url(),
            payload: { urls: ['http://169.254.169.254/computeMetadata/v1/'] },
        })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body).results[0]).toMatchObject({
            ok: false,
            error: 'Private or loopback host blocked',
        })
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    test('blocks RFC1918 (10/8) host without performing any fetch', async () => {
        mockEventFirestore(fastify)
        const res = await fastify.inject({
            method: 'POST',
            url: url(),
            payload: { urls: ['http://10.0.0.1/internal'] },
        })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body).results[0]).toMatchObject({
            ok: false,
            error: 'Private or loopback host blocked',
        })
        expect(fetchSpy).not.toHaveBeenCalled()
    })
})
