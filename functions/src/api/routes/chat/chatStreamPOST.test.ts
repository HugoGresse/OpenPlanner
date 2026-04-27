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

    test('listSpeakers returns the lean default projection (no bio / photoUrl) when fields is not passed', async () => {
        mockEventLookup(fastify)
        mockEventLoad()
        vi.spyOn(SessionDao, 'getSessions').mockResolvedValue([] as any)
        const speakers = [
            {
                id: 'sp1',
                name: 'Alice',
                jobTitle: 'Engineer',
                company: 'ACME',
                bio: 'a very long biography that should not reach the model by default',
                photoUrl: 'https://example.com/alice.png',
                geolocation: 'Paris',
                socials: [{ name: 'twitter', icon: 'twitter', link: 'https://t/x' }],
                email: 'a@x',
            },
        ]
        vi.spyOn(SpeakerDao, 'getSpeakers').mockResolvedValue(speakers as any)

        fetchSpy.mockResolvedValueOnce(
            sseStream([
                'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_x","function":{"name":"listSpeakers","arguments":"{}"}}]},"finish_reason":"tool_calls"}]}\n\n',
                'data: [DONE]\n\n',
            ])
        )
        fetchSpy.mockResolvedValueOnce(
            sseStream(['data: {"choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}]}\n\n', 'data: [DONE]\n\n'])
        )

        const res = await fastify.inject({
            method: 'POST',
            url,
            payload: { messages: [{ role: 'user', content: 'list speakers' }] },
        })
        expect(res.statusCode).toBe(200)
        expect(res.body).toContain('"name":"Alice"')
        expect(res.body).toContain('"jobTitle":"Engineer"')
        // Heavy fields are NOT in the default projection.
        expect(res.body).not.toContain('a very long biography')
        expect(res.body).not.toContain('"photoUrl"')
        expect(res.body).not.toContain('"geolocation"')
        expect(res.body).not.toContain('"socials"')
        // Private fields always stripped.
        expect(res.body).not.toContain('"email":"a@x"')
    })

    test('listSpeakers respects an explicit fields[] projection', async () => {
        mockEventLookup(fastify)
        mockEventLoad()
        vi.spyOn(SessionDao, 'getSessions').mockResolvedValue([] as any)
        const speakers = [
            {
                id: 'sp1',
                name: 'Alice',
                jobTitle: 'Engineer',
                company: 'ACME',
                bio: 'real bio text',
                photoUrl: 'https://example.com/alice.png',
            },
        ]
        vi.spyOn(SpeakerDao, 'getSpeakers').mockResolvedValue(speakers as any)

        const args = JSON.stringify({ fields: ['name', 'bio'] })
        fetchSpy.mockResolvedValueOnce(
            sseStream([
                `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_x","function":{"name":"listSpeakers","arguments":${JSON.stringify(
                    args
                )}}}]},"finish_reason":"tool_calls"}]}\n\n`,
                'data: [DONE]\n\n',
            ])
        )
        fetchSpy.mockResolvedValueOnce(
            sseStream(['data: {"choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}]}\n\n', 'data: [DONE]\n\n'])
        )

        const res = await fastify.inject({
            method: 'POST',
            url,
            payload: { messages: [{ role: 'user', content: 'list with bio' }] },
        })
        expect(res.statusCode).toBe(200)
        expect(res.body).toContain('"name":"Alice"')
        expect(res.body).toContain('real bio text')
        // jobTitle / company / photoUrl were NOT requested.
        expect(res.body).not.toContain('"jobTitle"')
        expect(res.body).not.toContain('"company"')
        expect(res.body).not.toContain('"photoUrl"')
    })

    test('emits multiple proposals in one turn for batch review', async () => {
        mockEventLookup(fastify)
        mockEventLoad()
        vi.spyOn(SessionDao, 'getSessions').mockResolvedValue([] as any)
        const sp1 = { id: 'sp1', name: 'Alice', bio: 'old' }
        const sp2 = { id: 'sp2', name: 'Bob', bio: 'old' }
        vi.spyOn(SpeakerDao, 'getSpeakers').mockResolvedValue([sp1, sp2] as any)
        const doesExist = vi.spyOn(SpeakerDao, 'doesSpeakerExist')
        doesExist.mockResolvedValueOnce(sp1 as any)
        doesExist.mockResolvedValueOnce(sp2 as any)

        const args1 = JSON.stringify({
            speakerId: 'sp1',
            expectedSpeakerName: 'Alice',
            patch: { bio: 'a' },
        })
        const args2 = JSON.stringify({
            speakerId: 'sp2',
            expectedSpeakerName: 'Bob',
            patch: { bio: 'b' },
        })

        // Single round: model emits two proposal tool calls in parallel.
        fetchSpy.mockResolvedValueOnce(
            sseStream([
                `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_a","function":{"name":"proposePatchSpeaker","arguments":${JSON.stringify(
                    args1
                )}}}, {"index":1,"id":"call_b","function":{"name":"proposePatchSpeaker","arguments":${JSON.stringify(
                    args2
                )}}}]},"finish_reason":"tool_calls"}]}\n\n`,
                'data: [DONE]\n\n',
            ])
        )
        // Wrap-up round
        fetchSpy.mockResolvedValueOnce(
            sseStream([
                'data: {"choices":[{"delta":{"content":"2 queued"},"finish_reason":"stop"}]}\n\n',
                'data: [DONE]\n\n',
            ])
        )

        const res = await fastify.inject({
            method: 'POST',
            url,
            payload: { messages: [{ role: 'user', content: 'change both bios' }] },
        })
        expect(res.statusCode).toBe(200)
        const proposalCount = (res.body.match(/"type":"proposal"/g) || []).length
        expect(proposalCount).toBe(2)
        // No per-batch rejection message either.
        expect(res.body).not.toContain('Cap of')
    })

    test('caps proposals per request at MAX_PROPOSALS_PER_REQUEST', async () => {
        mockEventLookup(fastify)
        mockEventLoad()
        vi.spyOn(SessionDao, 'getSessions').mockResolvedValue([] as any)
        const speaker = { id: 'sp1', name: 'Alice', bio: 'old' }
        vi.spyOn(SpeakerDao, 'getSpeakers').mockResolvedValue([speaker] as any)
        vi.spyOn(SpeakerDao, 'doesSpeakerExist').mockResolvedValue(speaker as any)

        // Build 26 tool calls in one round (cap is 25).
        const toolCalls = Array.from({ length: 26 }, (_, i) => ({
            index: i,
            id: `call_${i}`,
            function: {
                name: 'proposePatchSpeaker',
                arguments: JSON.stringify({
                    speakerId: 'sp1',
                    expectedSpeakerName: 'Alice',
                    patch: { bio: `v${i}` },
                }),
            },
        }))
        const argsPayload = JSON.stringify({ tool_calls: toolCalls })
        fetchSpy.mockResolvedValueOnce(
            sseStream([
                `data: {"choices":[{"delta":${argsPayload},"finish_reason":"tool_calls"}]}\n\n`,
                'data: [DONE]\n\n',
            ])
        )
        fetchSpy.mockResolvedValueOnce(
            sseStream([
                'data: {"choices":[{"delta":{"content":"done"},"finish_reason":"stop"}]}\n\n',
                'data: [DONE]\n\n',
            ])
        )

        const res = await fastify.inject({
            method: 'POST',
            url,
            payload: { messages: [{ role: 'user', content: 'do all' }] },
        })
        expect(res.statusCode).toBe(200)
        const proposalCount = (res.body.match(/"type":"proposal"/g) || []).length
        expect(proposalCount).toBe(25)
        expect(res.body).toContain('Cap of 25 proposals per request reached')
    })

    test('emits a proposal SSE event when the model calls a write tool (no DAO write)', async () => {
        mockEventLookup(fastify)
        mockEventLoad()
        vi.spyOn(SessionDao, 'getSessions').mockResolvedValue([] as any)
        const speaker = { id: 'sp1', name: 'Alice', bio: 'old bio' }
        vi.spyOn(SpeakerDao, 'getSpeakers').mockResolvedValue([speaker] as any)
        vi.spyOn(SpeakerDao, 'doesSpeakerExist').mockResolvedValue(speaker as any)

        // Round 1: model asks for proposePatchSpeaker
        const args = JSON.stringify({
            speakerId: 'sp1',
            expectedSpeakerName: 'Alice',
            patch: { bio: 'new bio' },
        })
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

    test('rejects a proposal when expectedSpeakerName does not match the speaker doc', async () => {
        mockEventLookup(fastify)
        mockEventLoad()
        vi.spyOn(SessionDao, 'getSessions').mockResolvedValue([] as any)
        const speaker = { id: 'sp1', name: 'Alice', bio: 'old' }
        vi.spyOn(SpeakerDao, 'getSpeakers').mockResolvedValue([speaker] as any)
        vi.spyOn(SpeakerDao, 'doesSpeakerExist').mockResolvedValue(speaker as any)

        // Model picked the right id (sp1 = Alice) but typed the wrong name in
        // expectedSpeakerName. The server must refuse rather than emit a
        // proposal that would patch the wrong-looking speaker.
        const args = JSON.stringify({
            speakerId: 'sp1',
            expectedSpeakerName: 'Bob',
            patch: { bio: 'something' },
        })
        fetchSpy.mockResolvedValueOnce(
            sseStream([
                `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_x","function":{"name":"proposePatchSpeaker","arguments":${JSON.stringify(
                    args
                )}}}]},"finish_reason":"tool_calls"}]}\n\n`,
                'data: [DONE]\n\n',
            ])
        )
        fetchSpy.mockResolvedValueOnce(
            sseStream(['data: {"choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}]}\n\n', 'data: [DONE]\n\n'])
        )

        const res = await fastify.inject({
            method: 'POST',
            url,
            payload: { messages: [{ role: 'user', content: 'change alice bio' }] },
        })
        expect(res.statusCode).toBe(200)
        expect(res.body).not.toContain('"type":"proposal"')
        expect(res.body).toContain('does not match the speaker document')
    })
})
