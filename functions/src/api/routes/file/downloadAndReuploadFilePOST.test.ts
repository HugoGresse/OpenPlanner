import { afterEach, describe, expect, test, vi } from 'vitest'
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

describe('POST /v1/:eventId/files/download-reupload', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/files/download-reupload`,
            payload: { url: 'https://example.com/file.png' },
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 400 when url is missing', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
        })

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/files/download-reupload?apiKey=${apiKey}`,
            payload: {},
        })
        expect(res.statusCode).toBe(400)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'FST_ERR_VALIDATION' })
    })

    test('returns 400 when fetch returns non-ok response', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
        })

        const fetchSpy = vi.fn(() =>
            Promise.resolve({
                ok: false,
                status: 404,
                statusText: 'Not Found',
            } as Response)
        )
        const originalFetch = globalThis.fetch
        globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch

        try {
            const res = await fastify.inject({
                method: 'POST',
                url: `/v1/${eventId}/files/download-reupload?apiKey=${apiKey}`,
                payload: { url: 'https://example.com/missing.png' },
            })
            expect(res.statusCode).toBe(400)
            expect(res.body).toContain('Failed to download file')
        } finally {
            globalThis.fetch = originalFetch
        }
    })
})
