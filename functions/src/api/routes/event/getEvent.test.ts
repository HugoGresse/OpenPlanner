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

describe('GET /v1/:eventId/event', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if event is not public', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            name: 'Test',
            publicEnabled: false,
        } as Event)

        const res = await fastify.inject({ method: 'get', url: `/v1/${eventId}/event` })
        expect(res.statusCode).toBe(401)
        expect(res.body).toContain('Event is not public')
    })

    test('returns 401 if public file is missing', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            name: 'Test',
            publicEnabled: true,
            files: null,
        } as unknown as Event)

        const res = await fastify.inject({ method: 'get', url: `/v1/${eventId}/event` })
        expect(res.statusCode).toBe(401)
        expect(res.body).toContain('Missing public file')
    })

    test('returns 200 with event name and storage URL', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            name: 'Test Event',
            publicEnabled: true,
            files: { public: 'public/openplanner.json' },
        } as unknown as Event)

        const res = await fastify.inject({ method: 'get', url: `/v1/${eventId}/event` })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({
            eventName: 'Test Event',
            dataUrl: 'https://storage.googleapis.com/test-bucket/public/openplanner.json',
        })
    })
})
