import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { SessionDao } from '../../dao/sessionDao'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((_fastify, _options, next) => next()),
    }
})

const eventId = 'evt-1'
const apiKey = 'test-key'
const sessionId = 'sess-1'

describe('DELETE /v1/:eventId/sessions/:sessionId', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({ method: 'DELETE', url: `/v1/${eventId}/sessions/${sessionId}` })
        expect(res.statusCode).toBe(401)
    })

    test('returns 404 when session does not exist', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(SessionDao, 'deleteSession').mockRejectedValue(new Error('Session not found'))

        const res = await fastify.inject({
            method: 'DELETE',
            url: `/v1/${eventId}/sessions/${sessionId}?apiKey=${apiKey}`,
        })
        expect(res.statusCode).toBe(404)
        expect(res.body).toContain('Session not found')
    })

    test('deletes the session and returns 200', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const deleteSpy = vi.spyOn(SessionDao, 'deleteSession').mockResolvedValue(undefined)

        const res = await fastify.inject({
            method: 'DELETE',
            url: `/v1/${eventId}/sessions/${sessionId}?apiKey=${apiKey}`,
        })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toEqual({ success: true })
        expect(deleteSpy).toHaveBeenCalledWith(fastify.firebase, eventId, sessionId)
    })
})
