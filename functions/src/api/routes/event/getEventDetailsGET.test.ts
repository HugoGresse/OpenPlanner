import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { toEventDetails } from './getEventDetailsGET'
import { Event } from '../../../types'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return { ...mod, setupFirebase: vi.fn().mockImplementation((fastify, _options, next) => next()) }
})

const eventId = 'evt-1'
const apiKey = 'test-key'
const eventDoc = {
    id: eventId,
    apiKey,
    name: 'Conf',
    openRouterAPIKey: 'secret',
    gladiaAPIKey: 'secret',
    tracks: [{ id: 't1', name: 'Main' }],
    categories: [{ id: 'c1', name: 'Web', color: '#fff' }],
    formats: [{ id: 'f1', name: 'Talk', durationMinutes: 40 }],
    publicEnabled: true,
}

describe('GET /v1/:eventId/event/details', () => {
    const fastify = setupFastify()

    afterEach(() => vi.restoreAllMocks())

    test('401 without apiKey keeps the real error body', async () => {
        const res = await fastify.inject({ method: 'GET', url: `/v1/${eventId}/event/details` })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ success: false, error: 'Unauthorized! Du balai !' })
    })

    test('returns settings without secrets', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore(eventDoc))
        const res = await fastify.inject({ method: 'GET', url: `/v1/${eventId}/event/details?apiKey=${apiKey}` })
        expect(res.statusCode).toBe(200)
        const body = JSON.parse(res.body)
        expect(body).toMatchObject({ id: eventId, name: 'Conf', tracks: eventDoc.tracks, publicEnabled: true })
        expect(body.scheduleVisible).toBe(false)
        expect(res.body).not.toContain('secret')
        expect(body.apiKey).toBeUndefined()
    })

    test('legacy items missing later fields are defaulted instead of failing', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(
            getMockedFirestore({
                ...eventDoc,
                formats: [{ id: 'f', name: 'F' }],
                speakerCustomFields: [{ id: 'x', name: 'X', type: 'text' }],
                sponsorCustomFields: [{ id: 'y', name: 'Y' }],
            })
        )
        const res = await fastify.inject({ method: 'GET', url: `/v1/${eventId}/event/details?apiKey=${apiKey}` })
        expect(res.statusCode).toBe(200)
        const body = JSON.parse(res.body)
        expect(body.formats).toEqual([{ id: 'f', name: 'F', durationMinutes: 20 }])
        expect(body.speakerCustomFields).toEqual([{ id: 'x', name: 'X', type: 'text', privacy: 'public' }])
        expect(body.sponsorCustomFields).toEqual([{ id: 'y', name: 'Y', type: 'text' }])
    })
})

describe('toEventDetails', () => {
    test('serialises dates and defaults missing arrays', () => {
        const details = toEventDetails({
            id: 'e',
            name: 'n',
            dates: { start: new Date('2026-06-01T08:00:00.000Z'), end: null },
        } as unknown as Event)
        expect(details.dates.start).toContain('2026-06-01T')
        expect(details.dates.end).toBeNull()
        expect(details.tracks).toEqual([])
        expect(details.timezone).toBeNull()
    })
})
