import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { Event } from '../../../types'
import { EventDao } from '../../dao/eventDao'
import { FaqDao } from '../../dao/faqDao'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((_fastify, _options, next) => next()),
    }
})

const eventId = 'evt-1'
const apiKey = 'xxx'

describe('FAQ routes', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('POST /v1/:eventId/faq returns 401 without apiKey', async () => {
        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/faq`,
            payload: {
                categoryId: 'cat-1',
                question: 'Q?',
                answer: 'A',
                order: 0,
                categoryOrder: 0,
            },
        })
        expect(res.statusCode).toBe(401)
    })

    test('POST /v1/:eventId/faq returns 400 on invalid body', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() =>
            getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
        )

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/faq?apiKey=${apiKey}`,
            payload: { categoryId: 'cat-1' },
        })
        expect(res.statusCode).toBe(400)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'FST_ERR_VALIDATION' })
    })

    test('POST /v1/:eventId/faq creates a question', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() =>
            getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
        )
        const addSpy = vi.spyOn(FaqDao, 'addFaqQuestion').mockResolvedValue('faq-id-1')

        const payload = {
            categoryId: 'cat-1',
            categoryName: 'General',
            question: 'Q?',
            answer: 'A',
            order: 1,
            categoryOrder: 1,
        }

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/faq?apiKey=${apiKey}`,
            payload,
        })
        expect(res.statusCode).toBe(201)
        expect(JSON.parse(res.body)).toMatchObject({ faqItemId: 'faq-id-1' })
        expect(addSpy).toHaveBeenCalledWith(fastify.firebase, eventId, payload)
    })

    test('GET /v1/:eventId/faq/:faqPrivateId returns categories with their questions', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: eventId,
            name: 'Test Event',
        } as Event)
        vi.spyOn(FaqDao, 'getFaqPrivateCategory').mockResolvedValue([
            { id: 'cat-1', name: 'General', order: 1, share: true },
        ])
        vi.spyOn(FaqDao, 'getFaqQuestions').mockResolvedValue([
            {
                id: 'q-1',
                categoryId: 'cat-1',
                question: 'Q?',
                answer: 'A',
                order: 1,
                categoryOrder: 1,
            },
        ])

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/faq/private-id-1`,
        })
        expect(res.statusCode).toBe(200)
        const body = JSON.parse(res.body)
        expect(body.eventName).toBe('Test Event')
        expect(body.faq).toHaveLength(1)
        expect(body.faq[0].category.id).toBe('cat-1')
        expect(body.faq[0].questions[0]).toMatchObject({
            id: 'q-1',
            categoryId: 'cat-1',
            categoryName: 'General',
        })
    })
})
