import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { Event } from '../../../types'
import { EventDao } from '../../dao/eventDao'
import { SessionDao } from '../../dao/sessionDao'
import { SpeakerDao } from '../../dao/speakerDao'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((_fastify, _options, next) => next()),
    }
})

const eventId = 'evt-1'
const apiKey = 'xxx'
const url = `/v1/${eventId}/chat?apiKey=${apiKey}`

const mockEventLookup = (fastify: any) => {
    vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() =>
        getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
    )
}

const mockEventLoad = (overrides: Partial<Event> = {}) => {
    vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
        id: eventId,
        name: 'Test Event',
        apiKey,
        dates: { start: null, end: null },
        ...overrides,
    } as Event)
}

const sseStream = (chunks: string[]): Response => {
    const encoder = new TextEncoder()
    const body = new ReadableStream({
        start(controller) {
            for (const c of chunks) controller.enqueue(encoder.encode(c))
            controller.close()
        },
    })
    return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

describe('POST /v1/:eventId/chat', () => {
    const fastify = setupFastify()
    let fetchSpy: ReturnType<typeof vi.fn>
    let originalEnv: string | undefined

    beforeEach(() => {
        originalEnv = process.env.OPENROUTER_API_KEY
        process.env.OPENROUTER_API_KEY = 'or-test'
        fetchSpy = vi.fn()
        globalThis.fetch = fetchSpy as unknown as typeof fetch
    })

    afterEach(() => {
        if (originalEnv === undefined) delete process.env.OPENROUTER_API_KEY
        else process.env.OPENROUTER_API_KEY = originalEnv
        vi.restoreAllMocks()
    })

    test('returns 401 without apiKey', async () => {
        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/chat`,
            payload: { messages: [{ role: 'user', content: 'hi' }] },
        })
        expect(res.statusCode).toBe(401)
    })

    test('returns 400 when messages is empty', async () => {
        mockEventLookup(fastify)
        const res = await fastify.inject({ method: 'POST', url, payload: { messages: [] } })
        expect(res.statusCode).toBe(400)
    })

    test('returns 400 when message count > 50', async () => {
        mockEventLookup(fastify)
        const messages = Array.from({ length: 51 }, () => ({ role: 'user' as const, content: 'x' }))
        const res = await fastify.inject({ method: 'POST', url, payload: { messages } })
        expect(res.statusCode).toBe(400)
    })

    test('returns 400 when a single message exceeds 50000 chars', async () => {
        mockEventLookup(fastify)
        const big = 'x'.repeat(50001)
        const res = await fastify.inject({
            method: 'POST',
            url,
            payload: { messages: [{ role: 'user', content: big }] },
        })
        expect(res.statusCode).toBe(400)
    })

    test('returns 500 when OPENROUTER_API_KEY is unset', async () => {
        delete process.env.OPENROUTER_API_KEY
        mockEventLookup(fastify)

        const res = await fastify.inject({
            method: 'POST',
            url,
            payload: { messages: [{ role: 'user', content: 'hi' }] },
        })
        expect(res.statusCode).toBe(500)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'OpenRouter API key not configured' })
    })

    test('streams an eventSummary prelude and forwards a content delta', async () => {
        mockEventLookup(fastify)
        mockEventLoad()
        vi.spyOn(SessionDao, 'getSessions').mockResolvedValue([{ id: 's1' }, { id: 's2' }] as any)
        vi.spyOn(SpeakerDao, 'getSpeakers').mockResolvedValue([{ id: 'sp1' }] as any)

        fetchSpy.mockResolvedValueOnce(
            sseStream([
                'data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n',
                'data: {"choices":[{"delta":{"content":"world"},"finish_reason":"stop"}]}\n\n',
                'data: [DONE]\n\n',
            ])
        )

        const res = await fastify.inject({
            method: 'POST',
            url,
            payload: { messages: [{ role: 'user', content: 'hi' }] },
        })
        expect(res.statusCode).toBe(200)
        expect(res.headers['content-type']).toBe('text/event-stream')
        expect(res.body).toContain('"type":"eventSummary"')
        expect(res.body).toContain('"sessionsCount":2')
        expect(res.body).toContain('"speakersCount":1')
        expect(res.body).toContain('"type":"content"')
        expect(res.body).toContain('Hello ')
        expect(res.body).toContain('world')
        expect(res.body.trimEnd().endsWith('data: [DONE]')).toBe(true)
    })

    test('executes a tool call from the model and forwards the result', async () => {
        mockEventLookup(fastify)
        mockEventLoad()
        vi.spyOn(SessionDao, 'getSessions').mockResolvedValue([] as any)
        const speakers = [
            { id: 'sp1', name: 'Alice', email: 'a@x', phone: '+1', note: 'private' },
            { id: 'sp2', name: 'Bob' },
        ]
        const speakersSpy = vi.spyOn(SpeakerDao, 'getSpeakers').mockResolvedValue(speakers as any)

        // Round 1: model asks for listSpeakers
        fetchSpy.mockResolvedValueOnce(
            sseStream([
                'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"listSpeakers","arguments":"{}"}}]},"finish_reason":"tool_calls"}]}\n\n',
                'data: [DONE]\n\n',
            ])
        )
        // Round 2: model produces final text
        fetchSpy.mockResolvedValueOnce(
            sseStream([
                'data: {"choices":[{"delta":{"content":"Two speakers found"},"finish_reason":"stop"}]}\n\n',
                'data: [DONE]\n\n',
            ])
        )

        const res = await fastify.inject({
            method: 'POST',
            url,
            payload: { messages: [{ role: 'user', content: 'list speakers' }] },
        })
        expect(res.statusCode).toBe(200)
        // listSpeakers triggers a second getSpeakers call (the prelude already called it once)
        expect(speakersSpy).toHaveBeenCalledTimes(2)
        expect(res.body).toContain('"type":"toolCall"')
        expect(res.body).toContain('"name":"listSpeakers"')
        expect(res.body).toContain('"type":"toolResult"')
        // Private fields stripped
        expect(res.body).not.toContain('"email":"a@x"')
        expect(res.body).not.toContain('"phone":"+1"')
        expect(res.body).not.toContain('"note":"private"')
        expect(res.body).toContain('Two speakers found')
        expect(fetchSpy).toHaveBeenCalledTimes(2)
    })
})
