import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { EventDao } from '../../dao/eventDao'
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

describe('GET /v1/:eventId/transcription', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if gladia api key or password is missing', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            name: 'Test',
            gladiaAPIKey: null,
            transcriptionPassword: null,
        } as unknown as Event)

        const res = await fastify.inject({
            method: 'get',
            url: `/v1/${eventId}/transcription`,
            headers: { password: 'whatever' },
        })
        expect(res.statusCode).toBe(401)
        expect(res.body).toContain('Missing Gladia API Key or password')
    })

    test('returns 401 if password header does not match', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            name: 'Test',
            gladiaAPIKey: 'gk',
            transcriptionPassword: 'expected',
            files: { public: 'public.json' },
        } as unknown as Event)

        const res = await fastify.inject({
            method: 'get',
            url: `/v1/${eventId}/transcription`,
            headers: { password: 'wrong' },
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({
            error: 'Password does not match',
        })
    })

    test('returns 401 if files.public is missing', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            name: 'Test',
            gladiaAPIKey: 'gk',
            transcriptionPassword: 'p',
            files: null,
        } as unknown as Event)

        const res = await fastify.inject({
            method: 'get',
            url: `/v1/${eventId}/transcription`,
            headers: { password: 'p' },
        })
        expect(res.statusCode).toBe(401)
        expect(res.body).toContain('Missing public file')
    })

    test('returns 200 with the gladia api key when password matches', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            name: 'Test Event',
            gladiaAPIKey: 'secret-gladia',
            transcriptionPassword: 'p',
            files: { public: 'public.json' },
        } as unknown as Event)

        const res = await fastify.inject({
            method: 'get',
            url: `/v1/${eventId}/transcription`,
            headers: { password: 'p' },
        })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({
            eventName: 'Test Event',
            gladiaAPIKey: 'secret-gladia',
            dataUrl: 'https://storage.googleapis.com/test-bucket/public.json',
        })
    })
})
