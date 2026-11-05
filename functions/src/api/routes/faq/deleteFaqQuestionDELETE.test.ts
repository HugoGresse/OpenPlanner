import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { NotFoundError } from '../../other/Errors'
import { FaqDao } from '../../dao/faqDao'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((_fastify, _options, next) => next()),
    }
})

const eventId = 'evt-1'
const apiKey = 'test-key'

describe('DELETE /v1/:eventId/faq/cat-1/questions/q-1', () => {
    const fastify = setupFastify()
    const url = `/v1/${eventId}/faq/cat-1/questions/q-1`

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({ method: 'DELETE', url })
        expect(res.statusCode).toBe(401)
    })

    test('returns 404 when the FAQ question does not exist', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(FaqDao, 'deleteFaqQuestion').mockRejectedValue(new NotFoundError())

        const res = await fastify.inject({ method: 'DELETE', url: `${url}?apiKey=${apiKey}` })
        expect(res.statusCode).toBe(404)
        expect(res.body).toContain('not found')
    })

    test('returns 400 on other failures', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(FaqDao, 'deleteFaqQuestion').mockRejectedValue(new Error('boom'))

        const res = await fastify.inject({ method: 'DELETE', url: `${url}?apiKey=${apiKey}` })
        expect(res.statusCode).toBe(400)
        expect(res.body).toContain('boom')
    })

    test('deletes the FAQ question and returns 200', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const deleteSpy = vi.spyOn(FaqDao, 'deleteFaqQuestion').mockResolvedValue(undefined as any)

        const res = await fastify.inject({ method: 'DELETE', url: `${url}?apiKey=${apiKey}` })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toEqual({ success: true })
        expect(deleteSpy).toHaveBeenCalledWith(fastify.firebase, eventId, 'cat-1', 'q-1')
    })
})
