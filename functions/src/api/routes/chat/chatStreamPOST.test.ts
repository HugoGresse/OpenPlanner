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
        openRouterAPIKey: 'or-test',
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

    beforeEach(() => {
        fetchSpy = vi.fn()
        globalThis.fetch = fetchSpy as unknown as typeof fetch
    })

    afterEach(() => {
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

    test('returns 400 when the event has no OpenRouter API key', async () => {
        mockEventLookup(fastify)
        mockEventLoad({ openRouterAPIKey: null } as unknown as Event)

        const res = await fastify.inject({
            method: 'POST',
            url,
            payload: { messages: [{ role: 'user', content: 'hi' }] },
        })
        expect(res.statusCode).toBe(400)
        expect(JSON.parse(res.body).error).toContain('OpenRouter API key is not set on this event')
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
        expect(String(res.headers['content-type'])).toContain('text/event-stream')
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

    test('returns 429 when the monthly token cap is reached', async () => {
        mockEventLookup(fastify)
        mockEventLoad({ openRouterMonthlyTokenCap: 1000 } as unknown as Event)
        const { AiUsageDao } = await import('../../dao/aiUsageDao')
        vi.spyOn(AiUsageDao, 'getMonthTokens').mockResolvedValue(2000)

        const res = await fastify.inject({
            method: 'POST',
            url,
            payload: { messages: [{ role: 'user', content: 'hi' }] },
        })
        expect(res.statusCode).toBe(429)
        expect(JSON.parse(res.body).error).toContain('Monthly OpenRouter token cap reached')
    })

    test('records token usage and emits a usage SSE event after a round', async () => {
        mockEventLookup(fastify)
        mockEventLoad()
        vi.spyOn(SessionDao, 'getSessions').mockResolvedValue([] as any)
        vi.spyOn(SpeakerDao, 'getSpeakers').mockResolvedValue([] as any)
        const { AiUsageDao } = await import('../../dao/aiUsageDao')
        const incSpy = vi.spyOn(AiUsageDao, 'incrementUsage').mockResolvedValue(undefined)

        fetchSpy.mockResolvedValueOnce(
            sseStream([
                'data: {"choices":[{"delta":{"content":"hi"},"finish_reason":"stop"}]}\n\n',
                'data: {"usage":{"prompt_tokens":12,"completion_tokens":3,"total_tokens":15}}\n\n',
                'data: [DONE]\n\n',
            ])
        )

        const res = await fastify.inject({
            method: 'POST',
            url,
            payload: { messages: [{ role: 'user', content: 'hello' }] },
        })
        expect(res.statusCode).toBe(200)
        expect(res.body).toContain('"type":"usage"')
        expect(res.body).toContain('"total_tokens":15')
        expect(incSpy).toHaveBeenCalledWith(
            fastify.firebase,
            eventId,
            expect.objectContaining({ prompt: 12, completion: 3, total: 15 })
        )
    })

    test('rejects a second proposal even across separate OpenRouter rounds', async () => {
        mockEventLookup(fastify)
        mockEventLoad()
        vi.spyOn(SessionDao, 'getSessions').mockResolvedValue([] as any)
        const speaker = { id: 'sp1', name: 'Alice', bio: 'old' }
        vi.spyOn(SpeakerDao, 'getSpeakers').mockResolvedValue([speaker] as any)
        const { SpeakerDao: S } = await import('../../dao/speakerDao')
        vi.spyOn(S, 'doesSpeakerExist').mockResolvedValue(speaker as any)

        const args1 = JSON.stringify({ speakerId: 'sp1', patch: { bio: 'first' } })
        const args2 = JSON.stringify({ speakerId: 'sp1', patch: { bio: 'second' } })

        // Round 1: model emits proposal #1
        fetchSpy.mockResolvedValueOnce(
            sseStream([
                `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_a","function":{"name":"proposePatchSpeaker","arguments":${JSON.stringify(
                    args1
                )}}}]},"finish_reason":"tool_calls"}]}\n\n`,
                'data: [DONE]\n\n',
            ])
        )
        // Round 2: model tries to emit a SECOND proposal
        fetchSpy.mockResolvedValueOnce(
            sseStream([
                `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_b","function":{"name":"proposePatchSpeaker","arguments":${JSON.stringify(
                    args2
                )}}}]},"finish_reason":"tool_calls"}]}\n\n`,
                'data: [DONE]\n\n',
            ])
        )
        // Round 3: model wraps up
        fetchSpy.mockResolvedValueOnce(
            sseStream(['data: {"choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}]}\n\n', 'data: [DONE]\n\n'])
        )

        const res = await fastify.inject({
            method: 'POST',
            url,
            payload: { messages: [{ role: 'user', content: 'change alice' }] },
        })
        expect(res.statusCode).toBe(200)
        // Exactly one proposal SSE event was emitted.
        const proposalCount = (res.body.match(/"type":"proposal"/g) || []).length
        expect(proposalCount).toBe(1)
        // The second attempt was rejected with the per-request guardrail.
        expect(res.body).toContain('Only one proposal per request is allowed')
    })

    test('emits a proposal SSE event when the model calls a write tool (no DAO write)', async () => {
        mockEventLookup(fastify)
        mockEventLoad()
        vi.spyOn(SessionDao, 'getSessions').mockResolvedValue([] as any)
        const speaker = { id: 'sp1', name: 'Alice', bio: 'old bio' }
        vi.spyOn(SpeakerDao, 'getSpeakers').mockResolvedValue([speaker] as any)
        vi.spyOn(SpeakerDao, 'doesSpeakerExist').mockResolvedValue(speaker as any)

        // Round 1: model asks for proposePatchSpeaker
        const args = JSON.stringify({ speakerId: 'sp1', patch: { bio: 'new bio' } })
        fetchSpy.mockResolvedValueOnce(
            sseStream([
                `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_w","function":{"name":"proposePatchSpeaker","arguments":${JSON.stringify(
                    args
                )}}}]},"finish_reason":"tool_calls"}]}\n\n`,
                'data: [DONE]\n\n',
            ])
        )
        // Round 2: model wraps up
        fetchSpy.mockResolvedValueOnce(
            sseStream([
                'data: {"choices":[{"delta":{"content":"Proposal sent"},"finish_reason":"stop"}]}\n\n',
                'data: [DONE]\n\n',
            ])
        )

        const res = await fastify.inject({
            method: 'POST',
            url,
            payload: { messages: [{ role: 'user', content: 'change alice bio' }] },
        })
        expect(res.statusCode).toBe(200)
        expect(res.body).toContain('"type":"proposal"')
        expect(res.body).toContain('"kind":"patchSpeaker"')
        expect(res.body).toContain('"path":"/v1/evt-1/speakers/sp1"')
        expect(res.body).toContain('"before"')
        expect(res.body).toContain('"after"')
        expect(res.body).toContain('"status":"pending_user_approval"')
    })
})
