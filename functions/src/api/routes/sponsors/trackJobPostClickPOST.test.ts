import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { JobPostDao } from '../../dao/jobPostDao'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((fastify, _options, next) => {
            next()
        }),
    }
})

describe('POST /v1/:eventId/sponsors/jobPosts/track-click', () => {
    const eventId = 'evt-1'
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 400 when body field jobPostId is missing', async () => {
        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/sponsors/jobPosts/track-click`,
            payload: {},
        })
        expect(res.statusCode).toBe(400)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'FST_ERR_VALIDATION' })
    })

    test('returns 404 when getJobPost throws', async () => {
        vi.spyOn(JobPostDao, 'getJobPost').mockRejectedValue(new Error('Job post not found'))

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/sponsors/jobPosts/track-click`,
            payload: { jobPostId: 'jp-1' },
        })

        expect(res.statusCode).toBe(404)
        expect(res.body).toContain('Job post not found')
    })

    test('returns 200 on happy path when trackJobPostClick returns true', async () => {
        vi.spyOn(JobPostDao, 'getJobPost').mockResolvedValue({ id: 'jp-1' } as any)
        vi.spyOn(JobPostDao, 'trackJobPostClick').mockResolvedValue(true)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/sponsors/jobPosts/track-click`,
            payload: { jobPostId: 'jp-1' },
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({ success: true })
    })

    test('returns 400 when trackJobPostClick returns false', async () => {
        vi.spyOn(JobPostDao, 'getJobPost').mockResolvedValue({ id: 'jp-1' } as any)
        vi.spyOn(JobPostDao, 'trackJobPostClick').mockResolvedValue(false)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/sponsors/jobPosts/track-click`,
            payload: { jobPostId: 'jp-1' },
        })

        expect(res.statusCode).toBe(400)
        expect(res.body).toContain('Failed to track job post click')
    })
})
