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

vi.mock('./updateWebsiteActions/getFilesNames', () => ({
    getUploadFilePathFromEvent: vi.fn(() =>
        Promise.resolve({
            public: 'public/openplanner.json',
            private: 'private/private.json',
            openfeedback: 'openfeedback.json',
            imageFolder: 'images/',
            voxxrin: null,
            pdf: null,
        })
    ),
}))

const eventId = 'evt-1'
const apiKey = 'xxx'

describe('GET /v1/:eventId/deploy/files', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/deploy/files`,
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 200 on happy path', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            apiKey,
        } as Event)

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/deploy/files?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({
            success: true,
            public: 'public/openplanner.json',
        })
    })

    test('returns 400 when getEvent throws', async () => {
        vi.spyOn(EventDao, 'getEvent').mockRejectedValue(new Error('boom'))

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/deploy/files?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(400)
        expect(JSON.parse(res.body)).toMatchObject({ success: false })
    })
})
