import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { EventDao } from '../../dao/eventDao'

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

describe('PATCH /v1/:eventId/event', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/event`,
            payload: { name: 'New Name' },
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 400 if body contains unknown field', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/event?apiKey=${apiKey}`,
            payload: { owner: 'hacker' },
        })
        expect(res.statusCode).toBe(400)
    })

    test('returns 404 when event does not exist', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(EventDao, 'patchEvent').mockRejectedValue(new Error('Event not found'))

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/event?apiKey=${apiKey}`,
            payload: { name: 'New Name' },
        })

        expect(res.statusCode).toBe(404)
        expect(res.body).toContain('Event not found')
    })

    test('calls patchEvent with correct args and returns 200', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const patchSpy = vi.spyOn(EventDao, 'patchEvent').mockResolvedValue(undefined)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/event?apiKey=${apiKey}`,
            payload: { name: 'Updated Conf', timezone: 'Europe/Paris', scheduleVisible: true },
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({ success: true })
        expect(patchSpy).toHaveBeenCalledWith(fastify.firebase, eventId, {
            name: 'Updated Conf',
            timezone: 'Europe/Paris',
            scheduleVisible: true,
        })
    })

    test('converts date strings to Date objects before calling patchEvent', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const patchSpy = vi.spyOn(EventDao, 'patchEvent').mockResolvedValue(undefined)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/event?apiKey=${apiKey}`,
            payload: { dates: { start: '2024-06-01', end: '2024-06-03' } },
        })

        expect(res.statusCode).toBe(200)
        const call = patchSpy.mock.calls[0][2]
        expect(call.dates).toBeTruthy()
        expect((call.dates as any).start).toBeInstanceOf(Date)
        expect((call.dates as any).end).toBeInstanceOf(Date)
    })

    test('returns 400 when dates.end is an invalid date string', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const patchSpy = vi.spyOn(EventDao, 'patchEvent').mockResolvedValue(undefined)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/event?apiKey=${apiKey}`,
            payload: { dates: { start: '2024-06-01', end: 'banana' } },
        })

        expect(res.statusCode).toBe(400)
        expect(res.body).toContain('Invalid dates.end')
        expect(patchSpy).not.toHaveBeenCalled()
    })

    test('only updates dates.end when start is omitted (true partial update)', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const patchSpy = vi.spyOn(EventDao, 'patchEvent').mockResolvedValue(undefined)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/event?apiKey=${apiKey}`,
            payload: { dates: { end: '2024-06-03' } },
        })

        expect(res.statusCode).toBe(200)
        const call = patchSpy.mock.calls[0][2]
        expect(call.dates).toBeTruthy()
        expect((call.dates as any).start).toBeUndefined()
        expect((call.dates as any).end).toBeInstanceOf(Date)
    })
})
