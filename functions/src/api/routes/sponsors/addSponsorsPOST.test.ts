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

describe('POST /v1/:eventId/sponsors', () => {
    const eventId = 'evt-1'
    const apiKey = 'xxx'
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/sponsors`,
            payload: {
                name: 'Acme',
                categoryId: 'cat-1',
                categoryName: 'Gold',
            },
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 400 if required body field is missing', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
        })

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/sponsors?apiKey=${apiKey}`,
            payload: {
                // missing name
                categoryId: 'cat-1',
                categoryName: 'Gold',
            },
        })
        expect(res.statusCode).toBe(400)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'FST_ERR_VALIDATION' })
    })

    test('returns 201 with sponsor and category info on happy path', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
        })

        const addSpy = vi.spyOn(SponsorDao, 'addSponsor').mockResolvedValue('spk-id')
        const getSpy = vi.spyOn(SponsorDao, 'getSponsor').mockResolvedValue({
            id: 'spk-id',
            name: 'Acme',
            logoUrl: '',
            website: 'https://acme.test',
        } as any)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/sponsors?apiKey=${apiKey}`,
            payload: {
                name: 'Acme',
                categoryId: 'cat-1',
                categoryName: 'Gold',
                website: 'https://acme.test',
            },
        })

        expect(res.statusCode).toBe(201)
        expect(JSON.parse(res.body)).toMatchObject({
            name: 'Acme',
            categoryId: 'cat-1',
            categoryName: 'Gold',
        })
        expect(addSpy).toHaveBeenCalledTimes(1)
        expect(getSpy).toHaveBeenCalledTimes(1)
    })
})
