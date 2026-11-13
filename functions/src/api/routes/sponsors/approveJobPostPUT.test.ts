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

describe('PUT /v1/:eventId/sponsors/jobPosts/:jobPostId/approval', () => {
    const eventId = 'evt-1'
    const jobPostId = 'jp-1'
    const apiKey = 'xxx'
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'PUT',
            url: `/v1/${eventId}/sponsors/jobPosts/${jobPostId}/approval`,
            payload: { status: JobStatus.APPROVED },
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 404 when job post does not exist', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
        })
        vi.spyOn(JobPostDao, 'getJobPost').mockRejectedValue(new Error('Job post not found'))

        const res = await fastify.inject({
            method: 'PUT',
            url: `/v1/${eventId}/sponsors/jobPosts/${jobPostId}/approval?apiKey=${apiKey}`,
            payload: { status: JobStatus.APPROVED },
        })

        expect(res.statusCode).toBe(404)
        expect(res.body).toContain('Job post not found')
    })

    test('returns 200 and calls setJobPostStatus with status on happy path', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
        })
        vi.spyOn(JobPostDao, 'getJobPost').mockResolvedValue({ id: jobPostId } as any)
        const setSpy = vi.spyOn(JobPostDao, 'setJobPostStatus').mockResolvedValue(true)

        const res = await fastify.inject({
            method: 'PUT',
            url: `/v1/${eventId}/sponsors/jobPosts/${jobPostId}/approval?apiKey=${apiKey}`,
            payload: { status: JobStatus.APPROVED },
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({ success: true })
        expect(setSpy).toHaveBeenCalledWith(fastify.firebase, eventId, jobPostId, JobStatus.APPROVED)
    })
})
