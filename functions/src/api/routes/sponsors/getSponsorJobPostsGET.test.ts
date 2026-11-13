import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { JobPostDao } from '../../dao/jobPostDao'
import { SponsorDao } from '../../dao/sponsorDao'
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

describe('GET /v1/:eventId/sponsors/job-posts', () => {
    const eventId = 'evt-1'
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 400 when sponsorToken is missing', async () => {
        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sponsors/job-posts`,
        })
        expect(res.statusCode).toBe(400)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'FST_ERR_VALIDATION' })
    })

    test('returns 401 when sponsor token is invalid', async () => {
        vi.spyOn(SponsorDao, 'findSponsorByToken').mockResolvedValue(null)

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sponsors/job-posts?sponsorToken=bad`,
        })

        expect(res.statusCode).toBe(401)
        expect(res.body).toContain('Invalid sponsor token')
    })

    test('returns 200 with sponsor and jobPosts on happy path', async () => {
        vi.spyOn(SponsorDao, 'findSponsorByToken').mockResolvedValue({
            sponsor: {
                id: 'spk-1',
                name: 'Acme',
                logoUrl: 'https://logo.test',
                website: 'https://acme.test',
            } as any,
            categoryId: 'cat-1',
        })
        vi.spyOn(JobPostDao, 'getJobPostsBySponsor').mockResolvedValue([
            {
                id: 'jp-1',
                sponsorId: 'spk-1',
                title: 'A',
                description: 'd',
                location: 'l',
                externalLink: 'https://x.test',
                category: 'Software Developer',
                status: JobStatus.PENDING,
                createdAt: {} as any,
            } as any,
        ])

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sponsors/job-posts?sponsorToken=good`,
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({
            sponsor: { id: 'spk-1', name: 'Acme' },
            jobPosts: [{ id: 'jp-1', sponsorId: 'spk-1' }],
        })
    })
})
