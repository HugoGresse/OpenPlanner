import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { SessionDao } from '../../dao/sessionDao'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((fastify, _options, next) => {
            next()
        }),
    }
})

const eventId = 'evt-1'
const sessionId = 'sess-1'
const apiKey = 'test-key'

describe('PATCH /v1/:eventId/sessions/:sessionId', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/sessions/${sessionId}`,
            payload: { title: 'New title' },
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 400 if body fails validation (unknown field)', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/sessions/${sessionId}?apiKey=${apiKey}`,
            payload: { unknownField: 'boom' },
        })
        expect(res.statusCode).toBe(400)
    })

    test('returns 404 when session does not exist', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(SessionDao, 'patchSession').mockRejectedValue(new Error('Session not found'))

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/sessions/${sessionId}?apiKey=${apiKey}`,
            payload: { title: 'New title' },
        })

        expect(res.statusCode).toBe(404)
        expect(res.body).toContain('Session not found')
    })

    test('calls patchSession with correct args and returns 200', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const patchSpy = vi.spyOn(SessionDao, 'patchSession').mockResolvedValue(undefined)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/sessions/${sessionId}?apiKey=${apiKey}`,
            payload: { title: 'Updated Talk', language: 'fr' },
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({ success: true })
        expect(patchSpy).toHaveBeenCalledWith(fastify.firebase, eventId, {
            id: sessionId,
            title: 'Updated Talk',
            language: 'fr',
        })
    })

    test('converts date strings to Date objects before calling patchSession', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const patchSpy = vi.spyOn(SessionDao, 'patchSession').mockResolvedValue(undefined)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/sessions/${sessionId}?apiKey=${apiKey}`,
            payload: { dates: { start: '2024-06-01T09:00:00.000Z', end: '2024-06-01T10:00:00.000Z' } },
        })

        expect(res.statusCode).toBe(200)
        const call = patchSpy.mock.calls[0][2]
        expect(call.dates).toBeTruthy()
        expect((call.dates as any).start).toBeInstanceOf(Date)
        expect((call.dates as any).end).toBeInstanceOf(Date)
    })
})
