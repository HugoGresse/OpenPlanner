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

describe('GET /v1/:eventId/sessions/:sessionId', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sessions/${sessionId}`,
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 404 when session does not exist', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(SessionDao, 'doesSessionExist').mockResolvedValue(false)

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sessions/${sessionId}?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(404)
        expect(res.body).toContain('Session not found')
    })

    test('returns 200 with session data and strips note', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(SessionDao, 'doesSessionExist').mockResolvedValue({
            id: sessionId,
            title: 'My Talk',
            abstract: null,
            conferenceHallId: null,
            dates: null,
            durationMinutes: 30,
            speakers: ['spk-1'],
            trackId: null,
            language: 'en',
            level: null,
            presentationLink: null,
            videoLink: null,
            imageUrl: null,
            format: null,
            category: null,
            image: null,
            showInFeedback: true,
            hideTrackTitle: false,
            note: 'secret',
            teaserVideoUrl: null,
            teaserImageUrl: null,
            teasingHidden: false,
            teasingPosts: null,
        } as any)

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sessions/${sessionId}?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(200)
        expect(SessionDao.doesSessionExist).toHaveBeenCalledWith(fastify.firebase, eventId, sessionId)
        const body = JSON.parse(res.body)
        expect(body.title).toBe('My Talk')
        expect(body).not.toHaveProperty('note')
    })
})
