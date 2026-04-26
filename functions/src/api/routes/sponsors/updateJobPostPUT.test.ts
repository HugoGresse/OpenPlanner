import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { JobPostDao } from '../../dao/jobPostDao'
import { SponsorDao } from '../../dao/sponsorDao'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((fastify, _options, next) => {
            next()
        }),
    }
})

describe('PUT /v1/:eventId/sponsors/job-posts/:jobPostId', () => {
    const eventId = 'evt-1'
    const jobPostId = 'jp-1'
    const fastify = setupFastify()

    const validBody = {
        title: 'Updated Title',
        description: 'desc',
        location: 'loc',
        externalLink: 'https://x.test',
        category: 'Software Developer',
        sponsorToken: 'token',
    }

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 when sponsor token is invalid', async () => {
        vi.spyOn(SponsorDao, 'findSponsorByToken').mockResolvedValue(null)

        const res = await fastify.inject({
            method: 'PUT',
            url: `/v1/${eventId}/sponsors/job-posts/${jobPostId}`,
            payload: validBody,
        })

        expect(res.statusCode).toBe(401)
        expect(res.body).toContain('Invalid sponsor token')
    })

    test('returns 401 when sponsor does not own the job post', async () => {
        vi.spyOn(SponsorDao, 'findSponsorByToken').mockResolvedValue({
            sponsor: { id: 'spk-1' } as any,
            categoryId: 'cat-1',
        })
        vi.spyOn(JobPostDao, 'getJobPost').mockResolvedValue({
            id: jobPostId,
            sponsorId: 'spk-other',
        } as any)

        const res = await fastify.inject({
            method: 'PUT',
            url: `/v1/${eventId}/sponsors/job-posts/${jobPostId}`,
            payload: validBody,
        })

        expect(res.statusCode).toBe(401)
        expect(res.body).toContain('Not authorized')
    })

    test('returns 404 when job post is missing', async () => {
        vi.spyOn(SponsorDao, 'findSponsorByToken').mockResolvedValue({
            sponsor: { id: 'spk-1' } as any,
            categoryId: 'cat-1',
        })
        vi.spyOn(JobPostDao, 'getJobPost').mockRejectedValue(new Error('Job post not found'))

        const res = await fastify.inject({
            method: 'PUT',
            url: `/v1/${eventId}/sponsors/job-posts/${jobPostId}`,
            payload: validBody,
        })

        expect(res.statusCode).toBe(404)
        expect(res.body).toContain('Job post not found')
    })

    test('returns 200 on happy path', async () => {
        vi.spyOn(SponsorDao, 'findSponsorByToken').mockResolvedValue({
            sponsor: { id: 'spk-1' } as any,
            categoryId: 'cat-1',
        })
        vi.spyOn(JobPostDao, 'getJobPost').mockResolvedValue({
            id: jobPostId,
            sponsorId: 'spk-1',
        } as any)
        const updateSpy = vi.spyOn(JobPostDao, 'updateJobPost').mockResolvedValue(true)

        const res = await fastify.inject({
            method: 'PUT',
            url: `/v1/${eventId}/sponsors/job-posts/${jobPostId}`,
            payload: validBody,
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({ success: true })
        expect(updateSpy).toHaveBeenCalledTimes(1)
        const updateData = updateSpy.mock.calls[0][3]
        expect((updateData as any).sponsorToken).toBeUndefined()
        expect(updateData).toMatchObject({ title: 'Updated Title' })
    })
})
