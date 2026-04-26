import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
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
const apiKey = 'test-key'

describe('GET /v1/:eventId/sponsors', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sponsors`,
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 200 and calls SponsorDao.getSponsors with eventId', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const getSpy = vi.spyOn(SponsorDao, 'getSponsors').mockResolvedValue([
            {
                id: 'cat-1',
                name: 'Gold',
                order: 1,
                sponsors: [
                    { id: 'sp-1', name: 'Acme', logoUrl: 'https://acme.com/logo.png', website: 'https://acme.com' },
                ],
            } as any,
        ])

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/sponsors?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(200)
        expect(getSpy).toHaveBeenCalledWith(fastify.firebase, eventId)
        const body = JSON.parse(res.body)
        expect(Array.isArray(body)).toBe(true)
        expect(body[0].name).toBe('Gold')
        expect(body[0].sponsors).toHaveLength(1)
        expect(body[0].sponsors[0].name).toBe('Acme')
    })
})
