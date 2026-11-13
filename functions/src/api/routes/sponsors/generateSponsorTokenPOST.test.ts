import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { Event } from '../../../types'
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

describe('POST /v1/:eventId/sponsors/generate-token', () => {
    const eventId = 'evt-1'
    const apiKey = 'xxx'
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/sponsors/generate-token`,
            payload: { sponsorId: 'spk-1', categoryId: 'cat-1' },
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 404 if sponsor lookup fails', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
        })
        vi.spyOn(SponsorDao, 'getSponsor').mockRejectedValue(new Error('Sponsor not found'))

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/sponsors/generate-token?apiKey=${apiKey}`,
            payload: { sponsorId: 'spk-1', categoryId: 'cat-1' },
        })

        expect(res.statusCode).toBe(404)
        expect(res.body).toContain('Sponsor not found')
    })

    test('returns 201 with the generated token on happy path', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
        })
        vi.spyOn(SponsorDao, 'getSponsor').mockResolvedValue({ id: 'spk-1' } as any)
        const tokenSpy = vi.spyOn(SponsorDao, 'generateTokenForSponsor').mockResolvedValue('token-abc')

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/sponsors/generate-token?apiKey=${apiKey}`,
            payload: { sponsorId: 'spk-1', categoryId: 'cat-1' },
        })

        expect(res.statusCode).toBe(201)
        expect(JSON.parse(res.body)).toMatchObject({ token: 'token-abc' })
        expect(tokenSpy).toHaveBeenCalledWith(fastify.firebase, eventId, 'cat-1', 'spk-1')
    })
})
