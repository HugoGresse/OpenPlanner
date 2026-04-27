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
const apiKey = 'test-key'

describe('GET /v1/:eventId/sessions', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sessions`,
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 400 if limit is invalid', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sessions?apiKey=${apiKey}&limit=9999`,
        })
        expect(res.statusCode).toBe(400)
    })

    test('returns 200 and calls SessionDao.getSessions with eventId', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const getSpy = vi.spyOn(SessionDao, 'getSessions').mockResolvedValue([
            {
                id: 'sess-1',
                title: 'Talk 1',
                abstract: null,
                conferenceHallId: null,
                dates: null,
                durationMinutes: 45,
                speakers: [],
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
                note: 'private-note',
                teaserVideoUrl: null,
                teaserImageUrl: null,
                teasingHidden: false,
                teasingPosts: null,
            } as any,
        ])

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sessions?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(200)
        expect(getSpy).toHaveBeenCalledWith(fastify.firebase, eventId)
        const body = JSON.parse(res.body)
        expect(Array.isArray(body)).toBe(true)
        expect(body).toHaveLength(1)
        expect(body[0]).not.toHaveProperty('note')
        expect(body[0].title).toBe('Talk 1')
    })

    test('filters by language query param', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(SessionDao, 'getSessions').mockResolvedValue([
            { id: 'sess-1', title: 'EN Talk', language: 'en', dates: null } as any,
            { id: 'sess-2', title: 'FR Talk', language: 'fr', dates: null } as any,
        ])

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sessions?apiKey=${apiKey}&language=en`,
        })

        expect(res.statusCode).toBe(200)
        const body = JSON.parse(res.body)
        expect(body).toHaveLength(1)
        expect(body[0].id).toBe('sess-1')
    })
})
