import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { EventDao } from '../../dao/eventDao'
import { SessionDao } from '../../dao/sessionDao'
import { SpeakerDao } from '../../dao/speakerDao'
import { Event } from '../../../types'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((_fastify, _options, next) => next()),
    }
})

const eventId = 'evt-1'
const apiKey = 'test-key'
const event = {
    id: eventId,
    apiKey,
    tracks: [{ id: 'track-1', name: 'Main' }],
    formats: [{ id: 'fmt-1', name: 'Talk', durationMinutes: 45 }],
    categories: [{ id: 'cat-1', name: 'Web' }],
} as unknown as Event

describe('POST /v1/:eventId/sessions', () => {
    const fastify = setupFastify()

    const mockHappyPath = () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue(event)
        vi.spyOn(SpeakerDao, 'doesSpeakerExist').mockImplementation(async (_app, _eventId, speakerId) =>
            speakerId === 'spk-1' ? ({ id: 'spk-1' } as any) : false
        )
        vi.spyOn(SessionDao, 'doesSessionExist').mockResolvedValue(false)
        return vi.spyOn(SessionDao, 'createSession').mockResolvedValue(undefined)
    }

    const post = (payload: object) =>
        fastify.inject({ method: 'POST', url: `/v1/${eventId}/sessions?apiKey=${apiKey}`, payload })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({ method: 'POST', url: `/v1/${eventId}/sessions`, payload: { title: 'T' } })
        expect(res.statusCode).toBe(401)
    })

    test('rejects unknown fields and a missing title', async () => {
        mockHappyPath()
        expect((await post({ title: 'T', speakerIds: ['spk-1'] })).statusCode).toBe(400)
        expect((await post({ abstract: 'no title' })).statusCode).toBe(400)
    })

    test('rejects references that do not exist on the event', async () => {
        const createSpy = mockHappyPath()
        const res = await post({ title: 'T', trackId: 'track-404' })
        expect(res.statusCode).toBe(400)
        expect(res.body).toContain('Unknown trackId "track-404". Valid ids: track-1')
        expect((await post({ title: 'T', format: 'fmt-404' })).body).toContain('Unknown format')
        expect((await post({ title: 'T', category: 'cat-404' })).body).toContain('Unknown category')
        expect(createSpy).not.toHaveBeenCalled()
    })

    test('rejects unknown speaker ids', async () => {
        mockHappyPath()
        const res = await post({ title: 'T', speakers: ['spk-1', 'spk-404'] })
        expect(res.statusCode).toBe(400)
        expect(res.body).toBe('Unknown speaker id(s): spk-404')
    })

    test('rejects an invalid date', async () => {
        mockHappyPath()
        const res = await post({ title: 'T', dates: { start: 'not-a-date' } })
        expect(res.statusCode).toBe(400)
        expect(res.body).toBe('Invalid dates.start value')
    })

    test('returns 409 when the id already exists', async () => {
        mockHappyPath()
        vi.spyOn(SessionDao, 'doesSessionExist').mockResolvedValue({ id: 'sess-1' } as any)
        const res = await post({ id: 'sess-1', title: 'T' })
        expect(res.statusCode).toBe(409)
        expect(res.body).toContain('sess-1')
    })

    test('creates the session with defaults and a generated id', async () => {
        const createSpy = mockHappyPath()
        const res = await post({ title: 'T', speakers: ['spk-1'], trackId: 'track-1', format: 'fmt-1' })
        expect(res.statusCode).toBe(201)
        const { id } = JSON.parse(res.body)
        expect(id).toMatch(/^[0-9a-f-]{36}$/)
        expect(createSpy).toHaveBeenCalledWith(fastify.firebase, eventId, {
            id,
            title: 'T',
            speakers: ['spk-1'],
            tags: [],
            dates: null,
            trackId: 'track-1',
            format: 'fmt-1',
        })
    })

    test('keeps the given id and parses dates', async () => {
        const createSpy = mockHappyPath()
        const res = await post({ id: 'my-id', title: 'T', dates: { start: '2026-06-01T09:00:00Z' } })
        expect(res.statusCode).toBe(201)
        expect(JSON.parse(res.body)).toEqual({ id: 'my-id' })
        expect(createSpy.mock.calls[0][2]).toMatchObject({
            id: 'my-id',
            dates: { start: new Date('2026-06-01T09:00:00Z'), end: null },
        })
    })
})
