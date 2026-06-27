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

describe('GET /v1/:eventId/intermission', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 200 without password when the event has no intermissionPassword', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            name: 'Test Event',
            intermissionPassword: null,
            files: { public: 'public.json' },
        } as unknown as Event)

        const res = await fastify.inject({ method: 'get', url: `/v1/${eventId}/intermission` })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({
            eventName: 'Test Event',
            dataUrl: 'https://storage.googleapis.com/test-bucket/public.json',
        })
    })

    test('returns 401 when a password is set but the header does not match', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            name: 'Test Event',
            intermissionPassword: 'secret',
            files: { public: 'public.json' },
        } as unknown as Event)

        const res = await fastify.inject({
            method: 'get',
            url: `/v1/${eventId}/intermission`,
            headers: { password: 'wrong' },
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Password does not match' })
    })

    test('returns 200 when the password matches', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            name: 'Test Event',
            intermissionPassword: 'secret',
            files: { public: 'public.json' },
        } as unknown as Event)

        const res = await fastify.inject({
            method: 'get',
            url: `/v1/${eventId}/intermission`,
            headers: { password: 'secret' },
        })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({
            eventName: 'Test Event',
            dataUrl: 'https://storage.googleapis.com/test-bucket/public.json',
        })
    })

    test('returns 401 if files.public is missing', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            name: 'Test Event',
            intermissionPassword: null,
            files: null,
        } as unknown as Event)

        const res = await fastify.inject({ method: 'get', url: `/v1/${eventId}/intermission` })
        expect(res.statusCode).toBe(401)
        expect(res.body).toContain('Missing public file')
    })
})
