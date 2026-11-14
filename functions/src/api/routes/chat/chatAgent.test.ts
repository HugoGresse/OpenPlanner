import firebase from 'firebase-admin'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildSystemPrompt, runChatAgent } from './chatAgent'

describe('buildSystemPrompt answerAnyQuestion', () => {
    it('leaves the prompt untouched when the flag is off (in-app chat and default Slack)', () => {
        const prompt = buildSystemPrompt('evt', 'DevFest', 'ui')
        expect(prompt).toBe(buildSystemPrompt('evt', 'DevFest', 'ui', false))
        expect(prompt).not.toContain('Scope:')
        // No stray blank line where the optional paragraph would go.
        expect(prompt).toContain('(id: evt).\n\nRead tools (')
    })

    it('adds the general-assistant paragraph when the flag is on', () => {
        const prompt = buildSystemPrompt('evt', 'DevFest', 'slack', true)
        expect(prompt).toContain('(id: evt).\n\nScope: besides managing the event, you may answer any other question')
        expect(prompt).toContain('about the event.\n\nRead tools (')
    })
})

describe('runChatAgent prompt caching', () => {
    const originalFetch = globalThis.fetch
    afterEach(() => {
        globalThis.fetch = originalFetch
        vi.restoreAllMocks()
    })

    const sse = (chunks: object[]): Response =>
        new Response([...chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`), 'data: [DONE]\n\n'].join(''), {
            status: 200,
        })

    const run = (model: string) =>
        runChatAgent({
            firebaseApp: {} as firebase.app.App,
            eventId: 'evt',
            eventName: 'DevFest',
            openRouterApiKey: 'key',
            model,
            messages: [{ role: 'user', content: 'hi' }],
            surface: 'ui',
            onEvent: () => undefined,
        })

    const bodyOf = (fetchSpy: ReturnType<typeof vi.fn>, call: number) =>
        JSON.parse(String(fetchSpy.mock.calls[call][1].body))

    it('retries once without cache markers when the provider rejects them, and keeps them off', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const fetchSpy = vi
            .fn()
            .mockResolvedValueOnce(new Response('cache_control is not supported', { status: 400 }))
            .mockResolvedValueOnce(sse([{ choices: [{ delta: { content: 'Hello' }, finish_reason: 'stop' }] }]))
        globalThis.fetch = fetchSpy as unknown as typeof fetch

        const result = await run('anthropic/claude-sonnet-4')

        expect(result.text).toBe('Hello')
        expect(fetchSpy).toHaveBeenCalledTimes(2)
        expect(JSON.stringify(bodyOf(fetchSpy, 0))).toContain('cache_control')
        expect(JSON.stringify(bodyOf(fetchSpy, 1))).not.toContain('cache_control')
        expect(typeof bodyOf(fetchSpy, 1).messages[0].content).toBe('string')
    })

    it('does not retry a 400 on a model that had no cache markers', async () => {
        const events: unknown[] = []
        const fetchSpy = vi.fn().mockResolvedValueOnce(new Response('bad model', { status: 400 }))
        globalThis.fetch = fetchSpy as unknown as typeof fetch

        await runChatAgent({
            firebaseApp: {} as firebase.app.App,
            eventId: 'evt',
            eventName: 'DevFest',
            openRouterApiKey: 'key',
            model: 'openai/gpt-5',
            messages: [{ role: 'user', content: 'hi' }],
            surface: 'ui',
            onEvent: (event) => events.push(event),
        })

        expect(fetchSpy).toHaveBeenCalledTimes(1)
        expect(events).toEqual([{ type: 'error', status: 400, error: 'bad model' }])
    })

    it('asks for usage and logs the cache counters of each round', async () => {
        const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
        const fetchSpy = vi
            .fn()
            .mockResolvedValueOnce(
                sse([
                    { choices: [{ delta: { content: 'Hi' }, finish_reason: 'stop' }] },
                    { choices: [], usage: { prompt_tokens: 9500, prompt_tokens_details: { cached_tokens: 9000 } } },
                ])
            )
        globalThis.fetch = fetchSpy as unknown as typeof fetch

        await run('anthropic/claude-sonnet-4')

        expect(bodyOf(fetchSpy, 0).usage).toEqual({ include: true })
        expect(info).toHaveBeenCalledWith('chat round', {
            eventId: 'evt',
            model: 'anthropic/claude-sonnet-4',
            round: 0,
            promptTokens: 9500,
            cachedTokens: 9000,
            cacheWriteTokens: 0,
        })
    })
})
