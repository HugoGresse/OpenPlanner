import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { Event } from '../../../types'
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

const eventId = 'evt-1'
const jobPostId = 'jp-1'
const apiKey = 'xxx'

const fastify = setupFastify()

describe('DELETE /v1/:eventId/sponsors/jobPosts/:jobPostId (apiKey)', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'DELETE',
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
            method: 'DELETE',
            url: `/v1/${eventId}/sponsors/jobPosts/${jobPostId}?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(404)
        expect(res.body).toContain('Job post not found')
    })

    test('returns 200 on happy path', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
        })
        vi.spyOn(JobPostDao, 'getJobPost').mockResolvedValue({ id: jobPostId } as any)
        const deleteSpy = vi.spyOn(JobPostDao, 'deleteJobPost').mockResolvedValue(true)

        const res = await fastify.inject({
            method: 'DELETE',
            url: `/v1/${eventId}/sponsors/jobPosts/${jobPostId}?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({ success: true })
        expect(deleteSpy).toHaveBeenCalledWith(fastify.firebase, eventId, jobPostId)
    })
})

describe('DELETE /v1/:eventId/sponsors/job-posts/:jobPostId (sponsor token)', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 400 when sponsorToken query param is missing', async () => {
        const res = await fastify.inject({
            method: 'DELETE',
            url: `/v1/${eventId}/sponsors/job-posts/${jobPostId}`,
        })
        expect(res.statusCode).toBe(400)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'FST_ERR_VALIDATION' })
    })

    test('returns 401 when sponsor token is invalid', async () => {
        vi.spyOn(SponsorDao, 'findSponsorByToken').mockResolvedValue(null)

        const res = await fastify.inject({
            method: 'DELETE',
            url: `/v1/${eventId}/sponsors/job-posts/${jobPostId}?sponsorToken=bad`,
        })

        expect(res.statusCode).toBe(401)
        expect(res.body).toContain('Invalid sponsor token')
    })

    test('returns 401 when sponsor is not owner', async () => {
        vi.spyOn(SponsorDao, 'findSponsorByToken').mockResolvedValue({
            sponsor: { id: 'spk-1' } as any,
            categoryId: 'cat-1',
        })
        vi.spyOn(JobPostDao, 'getJobPost').mockResolvedValue({
            id: jobPostId,
            sponsorId: 'spk-other',
        } as any)

        const res = await fastify.inject({
            method: 'DELETE',
            url: `/v1/${eventId}/sponsors/job-posts/${jobPostId}?sponsorToken=good`,
        })

        expect(res.statusCode).toBe(401)
        expect(res.body).toContain('Not authorized')
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
        const deleteSpy = vi.spyOn(JobPostDao, 'deleteJobPost').mockResolvedValue(true)

        const res = await fastify.inject({
            method: 'DELETE',
            url: `/v1/${eventId}/sponsors/job-posts/${jobPostId}?sponsorToken=good`,
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({ success: true })
        expect(deleteSpy).toHaveBeenCalledWith(fastify.firebase, eventId, jobPostId)
    })
})
