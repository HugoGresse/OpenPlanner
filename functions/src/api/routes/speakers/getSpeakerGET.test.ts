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
const speakerId = 'spk-1'
const apiKey = 'test-key'

const baseSpeaker = {
    id: speakerId,
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
}

describe('GET /v1/:eventId/speakers/:speakerId', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/speakers/${speakerId}`,
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 404 when speaker does not exist', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(SpeakerDao, 'doesSpeakerExist').mockResolvedValue(false)

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/speakers/${speakerId}?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(404)
        expect(res.body).toContain('Speaker not found')
    })

    test('strips private fields by default', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(SpeakerDao, 'doesSpeakerExist').mockResolvedValue(baseSpeaker as any)

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/speakers/${speakerId}?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(200)
        expect(SpeakerDao.doesSpeakerExist).toHaveBeenCalledWith(fastify.firebase, eventId, speakerId)
        const body = JSON.parse(res.body)
        expect(body.name).toBe('Alice')
        expect(body).not.toHaveProperty('note')
        expect(body).not.toHaveProperty('email')
        expect(body).not.toHaveProperty('phone')
    })

    test('includes private fields when includePrivate=true', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(SpeakerDao, 'doesSpeakerExist').mockResolvedValue(baseSpeaker as any)

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/speakers/${speakerId}?apiKey=${apiKey}&includePrivate=true`,
        })

        expect(res.statusCode).toBe(200)
        const body = JSON.parse(res.body)
        expect(body.email).toBe('alice@example.com')
        expect(body.phone).toBe('123')
        expect(body.note).toBe('private')
    })
})
