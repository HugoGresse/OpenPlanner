import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
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
const apiKey = 'test-key'

describe('GET /v1/:eventId/speakers', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/speakers`,
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 400 if limit exceeds maximum', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/speakers?apiKey=${apiKey}&limit=9999`,
        })
        expect(res.statusCode).toBe(400)
    })

    test('returns 200 and strips private fields by default', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const getSpy = vi.spyOn(SpeakerDao, 'getSpeakers').mockResolvedValue([
            {
                id: 'spk-1',
                name: 'Alice',
                email: 'alice@example.com',
                phone: '123',
                note: 'private',
                pronouns: null,
                jobTitle: null,
                bio: null,
                company: null,
                companyLogoUrl: null,
                conferenceHallId: null,
                geolocation: null,
                photoUrl: null,
                socials: [],
            } as any,
        ])

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/speakers?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(200)
        expect(getSpy).toHaveBeenCalledWith(fastify.firebase, eventId)
        const body = JSON.parse(res.body)
        expect(Array.isArray(body)).toBe(true)
        expect(body[0].name).toBe('Alice')
        expect(body[0]).not.toHaveProperty('note')
        expect(body[0]).not.toHaveProperty('email')
        expect(body[0]).not.toHaveProperty('phone')
    })
})
