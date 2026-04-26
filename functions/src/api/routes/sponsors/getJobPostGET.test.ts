import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { Event } from '../../../types'
import { JobPostDao } from '../../dao/jobPostDao'
import { JobStatus } from '../../../../../src/constants/jobStatus'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((fastify, _options, next) => {
            next()
        }),
    }
})

describe('GET /v1/:eventId/sponsors/jobPosts/:jobPostId', () => {
    const eventId = 'evt-1'
    const jobPostId = 'jp-1'
    const apiKey = 'xxx'
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sponsors/jobPosts/${jobPostId}`,
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 404 when getJobPost throws', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
        })
        vi.spyOn(JobPostDao, 'getJobPost').mockRejectedValue(new Error('Job post not found'))

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sponsors/jobPosts/${jobPostId}?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(404)
        expect(res.body).toContain('Job post not found')
    })

    test('returns 200 with job post on happy path', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
        })
        vi.spyOn(JobPostDao, 'getJobPost').mockResolvedValue({
            id: jobPostId,
            sponsorId: 'spk-1',
            title: 'Job',
            description: 'desc',
            location: 'loc',
            externalLink: 'https://x.test',
            category: 'Software Developer',
            status: JobStatus.PENDING,
            createdAt: {} as any,
        } as any)

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sponsors/jobPosts/${jobPostId}?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({ id: jobPostId, title: 'Job' })
    })
})
