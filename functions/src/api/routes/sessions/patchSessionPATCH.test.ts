import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { SessionDao } from '../../dao/sessionDao'
import { SpeakerDao } from '../../dao/speakerDao'

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

    test('rejects an unknown field by name instead of dropping it', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const patchSpy = vi.spyOn(SessionDao, 'patchSession').mockResolvedValue(undefined)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/sessions/${sessionId}?apiKey=${apiKey}`,
            payload: { title: 'Kept', titel: 'typo' },
        })
        expect(res.statusCode).toBe(400)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'FST_ERR_VALIDATION' })
        expect(res.body).toContain('titel')
        expect(patchSpy).not.toHaveBeenCalled()
    })

    test('keeps an explicit null as null and does not coerce types', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const patchSpy = vi.spyOn(SessionDao, 'patchSession').mockResolvedValue(undefined)
        const url = `/v1/${eventId}/sessions/${sessionId}?apiKey=${apiKey}`

        const cleared = await fastify.inject({ method: 'PATCH', url, payload: { abstract: null, trackId: null } })
        expect(cleared.statusCode).toBe(200)
        expect(patchSpy.mock.calls[0][2]).toEqual({ id: sessionId, abstract: null, trackId: null })

        const coerced = await fastify.inject({ method: 'PATCH', url, payload: { durationMinutes: '45' } })
        expect(coerced.statusCode).toBe(400)
    })

    test('rejects a track, format, category or speaker that does not exist', async () => {
        const event = { id: eventId, apiKey, tracks: [{ id: 'main', name: 'Main' }], formats: [], categories: [] }
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore(event))
        const patchSpy = vi.spyOn(SessionDao, 'patchSession').mockResolvedValue(undefined)
        const missingSpy = vi.spyOn(SpeakerDao, 'findMissingSpeakerIds').mockResolvedValue(['ghost'])
        const url = `/v1/${eventId}/sessions/${sessionId}?apiKey=${apiKey}`

        const track = await fastify.inject({ method: 'PATCH', url, payload: { trackId: 'room9' } })
        expect(track.statusCode).toBe(400)
        expect(track.body).toBe('Unknown trackId "room9". Valid ids: main')

        const speakers = await fastify.inject({ method: 'PATCH', url, payload: { speakers: ['ghost'] } })
        expect(speakers.statusCode).toBe(400)
        expect(speakers.body).toBe('Unknown speaker id(s): ghost')
        expect(patchSpy).not.toHaveBeenCalled()

        missingSpy.mockResolvedValue([])
        const valid = await fastify.inject({ method: 'PATCH', url, payload: { trackId: 'main', speakers: ['ada'] } })
        expect(valid.statusCode).toBe(200)
        expect(patchSpy).toHaveBeenCalledTimes(1)
    })

    test('a patch without references reads neither the event lists nor the speakers', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(SessionDao, 'patchSession').mockResolvedValue(undefined)
        const missingSpy = vi.spyOn(SpeakerDao, 'findMissingSpeakerIds')

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/sessions/${sessionId}?apiKey=${apiKey}`,
            payload: { title: 'Only the title', speakers: [] },
        })
        expect(res.statusCode).toBe(200)
        expect(missingSpy).not.toHaveBeenCalled()
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

    test('returns 400 when dates.start is an invalid date string', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const patchSpy = vi.spyOn(SessionDao, 'patchSession').mockResolvedValue(undefined)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/sessions/${sessionId}?apiKey=${apiKey}`,
            payload: { dates: { start: 'not-a-real-date' } },
        })

        expect(res.statusCode).toBe(400)
        expect(res.body).toContain('Invalid dates.start')
        expect(patchSpy).not.toHaveBeenCalled()
    })

    test('only updates dates.start when end is omitted (true partial update)', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const patchSpy = vi.spyOn(SessionDao, 'patchSession').mockResolvedValue(undefined)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/sessions/${sessionId}?apiKey=${apiKey}`,
            payload: { dates: { start: '2024-06-01T09:00:00.000Z' } },
        })

        expect(res.statusCode).toBe(200)
        const call = patchSpy.mock.calls[0][2]
        expect(call.dates).toBeTruthy()
        expect((call.dates as any).start).toBeInstanceOf(Date)
        expect((call.dates as any).end).toBeUndefined()
    })

    test('clears dates with explicit null', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const patchSpy = vi.spyOn(SessionDao, 'patchSession').mockResolvedValue(undefined)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/sessions/${sessionId}?apiKey=${apiKey}`,
            payload: { dates: null },
        })

        expect(res.statusCode).toBe(200)
        expect(patchSpy.mock.calls[0][2].dates).toBeNull()
    })
})
