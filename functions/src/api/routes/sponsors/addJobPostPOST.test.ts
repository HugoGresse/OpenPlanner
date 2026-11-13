import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { Event } from '../../../types'
import { EventDao } from '../../dao/eventDao'
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
const validJobBody = {
    sponsorId: 'spk-1',
    title: 'Senior Dev',
    description: 'Build cool stuff',
    location: 'Paris',
    externalLink: 'https://jobs.test/1',
    category: 'Software Developer',
}

const fastify = setupFastify()

describe('POST /v1/:eventId/sponsors/jobPosts (private id)', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 when addJobPostEnabled is false', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            addJobPostEnabled: false,
            addJobPostPrivateId: 'priv-1',
        } as unknown as Event)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/sponsors/jobPosts`,
            payload: { ...validJobBody, addJobPostPrivateId: 'priv-1' },
        })

        expect(res.statusCode).toBe(401)
        expect(res.body).toContain('Job posting is not enabled')
    })

    test('returns 401 when addJobPostPrivateId does not match', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            addJobPostEnabled: true,
            addJobPostPrivateId: 'priv-1',
        } as unknown as Event)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/sponsors/jobPosts`,
            payload: { ...validJobBody, addJobPostPrivateId: 'wrong' },
        })

        expect(res.statusCode).toBe(401)
        expect(res.body).toContain('Invalid addJobPostPrivateId')
    })

    test('returns 201 on happy path', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            addJobPostEnabled: true,
            addJobPostPrivateId: 'priv-1',
        } as unknown as Event)
        const addSpy = vi.spyOn(JobPostDao, 'addJobPost').mockResolvedValue('jp-id')

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/sponsors/jobPosts`,
            payload: { ...validJobBody, addJobPostPrivateId: 'priv-1' },
        })

        expect(res.statusCode).toBe(201)
        expect(JSON.parse(res.body)).toMatchObject({ jobPostId: 'jp-id' })
        expect(addSpy).toHaveBeenCalledTimes(1)
    })
})

describe('POST /v1/:eventId/sponsors/job-posts (sponsor token)', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 when sponsor token is invalid', async () => {
        vi.spyOn(SponsorDao, 'findSponsorByToken').mockResolvedValue(null)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/sponsors/job-posts`,
            payload: { ...validJobBody, sponsorToken: 'bad-token' },
        })

        expect(res.statusCode).toBe(401)
        expect(res.body).toContain('Invalid sponsor token')
    })

    test('returns 201 and attaches sponsorId on happy path', async () => {
        vi.spyOn(SponsorDao, 'findSponsorByToken').mockResolvedValue({
            sponsor: { id: 'spk-1', name: 'Acme' } as any,
            categoryId: 'cat-1',
        })
        const addSpy = vi.spyOn(JobPostDao, 'addJobPost').mockResolvedValue('jp-id')

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/sponsors/job-posts`,
            payload: { ...validJobBody, sponsorToken: 'good-token' },
        })

        expect(res.statusCode).toBe(201)
        expect(JSON.parse(res.body)).toMatchObject({ jobPostId: 'jp-id' })
        expect(addSpy).toHaveBeenCalledTimes(1)
        const callArgs = addSpy.mock.calls[0][2]
        expect(callArgs).toMatchObject({
            sponsorId: 'spk-1',
            title: validJobBody.title,
        })
        expect((callArgs as any).sponsorToken).toBeUndefined()
    })
})
