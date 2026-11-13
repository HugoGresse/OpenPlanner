import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { Event } from '../../../types'
import { JobPostDao } from '../../dao/jobPostDao'
import { JobStatus } from '../../../../../src/constants/jobStatus'

const sampleJobPost = {
    id: 'jp-1',
    sponsorId: 'spk-1',
    title: 'A',
    description: 'd',
    location: 'l',
    externalLink: 'https://x.test',
    status: JobStatus.PENDING,
    createdAt: {} as any,
} as any

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((fastify, _options, next) => {
            next()
        }),
    }
})

describe('GET /v1/:eventId/sponsors/jobPosts', () => {
    const eventId = 'evt-1'
    const apiKey = 'xxx'
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sponsors/jobPosts`,
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 200 with all job posts when no sponsorId', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
        })
        const allSpy = vi.spyOn(JobPostDao, 'getAllJobPosts').mockResolvedValue([sampleJobPost])
        const bySponsorSpy = vi.spyOn(JobPostDao, 'getJobPostsBySponsor')

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sponsors/jobPosts?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject([{ id: 'jp-1', sponsorId: 'spk-1' }])
        expect(allSpy).toHaveBeenCalledTimes(1)
        expect(bySponsorSpy).not.toHaveBeenCalled()
    })

    test('returns 200 with job posts filtered by sponsorId', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
        })
        const bySponsorSpy = vi
            .spyOn(JobPostDao, 'getJobPostsBySponsor')
            .mockResolvedValue([{ ...sampleJobPost, id: 'jp-2', sponsorId: 'spk-1' }])
        const allSpy = vi.spyOn(JobPostDao, 'getAllJobPosts')

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sponsors/jobPosts?apiKey=${apiKey}&sponsorId=spk-1`,
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject([{ id: 'jp-2', sponsorId: 'spk-1' }])
        expect(bySponsorSpy).toHaveBeenCalledWith(fastify.firebase, eventId, 'spk-1', undefined)
        expect(allSpy).not.toHaveBeenCalled()
    })
})
