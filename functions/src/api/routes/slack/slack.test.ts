import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { Event } from '../../../types'
import { EventDao } from '../../dao/eventDao'
import { AiActionDao } from '../../dao/aiActionDao'
import { SlackProposalDao, SlackProposalRecord } from '../../dao/slackProposalDao'
import { computeSlackSignature } from './slackSignature'
import { SLACK_ACTION_IDS } from './slackFormat'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((_fastify, _options, next) => next()),
    }
})

const eventId = 'evt-1'
const signingSecret = 'slack-secret'
const botToken = 'xoxb-test'
const botUserId = 'U0BOT'

const mockEventLoad = (overrides: Partial<Event> = {}) => {
    vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
        id: eventId,
        name: 'Test Event',
        apiKey: 'op_key',
        openRouterAPIKey: 'or-test',
        slackSigningSecret: signingSecret,
        slackBotToken: botToken,
        dates: { start: null, end: null },
        ...overrides,
    } as Event)
}

const signedHeaders = (rawBody: string, contentType: string, secret = signingSecret) => {
    const timestamp = String(Math.floor(Date.now() / 1000))
    return {
        'content-type': contentType,
        'x-slack-request-timestamp': timestamp,
        'x-slack-signature': computeSlackSignature(secret, timestamp, rawBody),
    }
}

const sseChunk = (delta: object) => `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`

const openRouterStream = (chunks: string[]): Response => {
    const encoder = new TextEncoder()
    const body = new ReadableStream({
        start(controller) {
            for (const c of chunks) controller.enqueue(encoder.encode(c))
            controller.close()
        },
    })
    return new Response(body, { status: 200 })
}

const slackOk = (extra: object = {}) => new Response(JSON.stringify({ ok: true, ...extra }), { status: 200 })

const mentionEvent = (text: string, extra: object = {}) =>
    JSON.stringify({
        type: 'event_callback',
        authorizations: [{ user_id: botUserId }],
        event: { type: 'app_mention', channel: 'C1', user: 'U1', text, ts: '100.1', ...extra },
    })

describe('Slack routes', () => {
    const fastify = setupFastify()
    const eventsUrl = `/v1/${eventId}/slack/events`
    const interactionsUrl = `/v1/${eventId}/slack/interactions`
    let fetchSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
        fetchSpy = vi.fn()
        globalThis.fetch = fetchSpy as unknown as typeof fetch
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('answers url_verification with the challenge', async () => {
        mockEventLoad()
        const raw = JSON.stringify({ type: 'url_verification', challenge: 'abc' })
        const res = await fastify.inject({
            method: 'POST',
            url: eventsUrl,
            headers: signedHeaders(raw, 'application/json'),
            payload: raw,
        })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({ challenge: 'abc' })
        expect(res.headers['x-slack-no-retry']).toBe('1')
    })

    test('rejects a bad signature and an unconfigured event', async () => {
        mockEventLoad()
        const raw = JSON.stringify({ type: 'url_verification', challenge: 'abc' })
        const bad = await fastify.inject({
            method: 'POST',
            url: eventsUrl,
            headers: signedHeaders(raw, 'application/json', 'wrong'),
            payload: raw,
        })
        expect(bad.statusCode).toBe(401)

        mockEventLoad({ slackSigningSecret: null })
        const unconfigured = await fastify.inject({
            method: 'POST',
            url: eventsUrl,
            headers: signedHeaders(raw, 'application/json'),
            payload: raw,
        })
        expect(unconfigured.statusCode).toBe(401)
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    test('drops Slack retries and bot / non-mention events without calling anything', async () => {
        mockEventLoad()
        const raw = mentionEvent('<@U0BOT> hi')
        const retried = await fastify.inject({
            method: 'POST',
            url: eventsUrl,
            headers: { ...signedHeaders(raw, 'application/json'), 'x-slack-retry-num': '1' },
            payload: raw,
        })
        expect(retried.json()).toEqual({ ok: true, ignored: 'retry' })

        const fromBot = mentionEvent('hi', { bot_id: 'B1' })
        await fastify.inject({
            method: 'POST',
            url: eventsUrl,
            headers: signedHeaders(fromBot, 'application/json'),
            payload: fromBot,
        })
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    test('app_mention: builds context from the thread, streams a reply and posts proposals', async () => {
        mockEventLoad()
        const saveSpy = vi.spyOn(SlackProposalDao, 'saveProposals').mockResolvedValue()
        const { SpeakerDao } = await import('../../dao/speakerDao')
        vi.spyOn(SpeakerDao, 'doesSpeakerExist').mockResolvedValue({ name: 'Alice' } as never)

        let postCount = 0
        const openRouterCalls: Array<Record<string, unknown>> = []
        fetchSpy.mockImplementation(async (url: string, init: RequestInit) => {
            if (url.includes('openrouter.ai')) {
                const body = JSON.parse(String(init.body))
                openRouterCalls.push(body)
                if (openRouterCalls.length === 1) {
                    return openRouterStream([
                        sseChunk({
                            tool_calls: [
                                {
                                    index: 0,
                                    id: 'call_1',
                                    function: {
                                        name: 'proposePatchSpeaker',
                                        arguments: JSON.stringify({
                                            speakerId: 's1',
                                            expectedSpeakerName: 'Alice',
                                            patch: { name: 'Alicia' },
                                        }),
                                    },
                                },
                            ],
                        }),
                        `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] })}\n\n`,
                    ])
                }
                return openRouterStream([sseChunk({ content: '**Queued** 1 change' }), 'data: [DONE]\n\n'])
            }
            if (url.endsWith('conversations.replies')) {
                return slackOk({
                    messages: [{ ts: '100.1', user: 'U1', text: '<@U0BOT> rename Alice to Alicia' }],
                })
            }
            if (url.endsWith('chat.postMessage')) {
                postCount++
                return slackOk({ channel: 'C1', ts: `200.${postCount}` })
            }
            if (url.endsWith('chat.update')) return slackOk()
            throw new Error(`unexpected fetch ${url}`)
        })

        const raw = mentionEvent('<@U0BOT> rename Alice to Alicia')
        const res = await fastify.inject({
            method: 'POST',
            url: eventsUrl,
            headers: signedHeaders(raw, 'application/json'),
            payload: raw,
        })
        expect(res.statusCode).toBe(200)

        const firstMessages = openRouterCalls[0].messages as Array<{ role: string; content: string }>
        expect(firstMessages[0].role).toBe('system')
        expect(firstMessages[0].content).toContain('Slack')
        expect(firstMessages.slice(1)).toEqual([{ role: 'user', content: 'rename Alice to Alicia' }])

        const calls = fetchSpy.mock.calls.map(([url, init]) => [
            String(url).split('/').pop(),
            JSON.parse(String(init.body)),
        ])
        const update = calls.filter(([m]) => m === 'chat.update').pop()?.[1]
        expect(update.ts).toBe('200.1')
        expect(update.text).toBe('*Queued* 1 change')

        const proposalPost = calls.filter(([m]) => m === 'chat.postMessage')[1][1]
        expect(proposalPost.thread_ts).toBe('100.1')
        expect(JSON.stringify(proposalPost.blocks)).toContain(SLACK_ACTION_IDS.applyProposal)

        expect(saveSpy).toHaveBeenCalledTimes(1)
        const [, , records] = saveSpy.mock.calls[0]
        expect(records).toHaveLength(1)
        expect(records[0]).toMatchObject({ id: 'call_1', batchId: '200.1', status: 'pending', messageTs: '200.2' })
    })

    const pendingRecord: SlackProposalRecord = {
        id: 'call_1',
        batchId: '200.1',
        status: 'pending',
        channel: 'C1',
        threadTs: '100.1',
        messageTs: '200.2',
        prompt: 'rename Alice to Alicia',
        model: 'm',
        proposal: {
            kind: 'patchSpeaker',
            summary: 'Update speaker Alice',
            endpoint: { method: 'PATCH', path: `/v1/${eventId}/speakers/s1`, body: { name: 'Alicia' } },
            target: { id: 's1', label: 'Alice' },
            diff: { before: { name: 'Alice' }, after: { name: 'Alicia' } },
        },
    }

    const interaction = (actionId: string, value: string) =>
        'payload=' +
        encodeURIComponent(
            JSON.stringify({
                type: 'block_actions',
                user: { id: 'U1' },
                channel: { id: 'C1' },
                message: { ts: '200.3' },
                actions: [{ action_id: actionId, value }],
            })
        )

    test('Apply button replays the endpoint, records the audit row and updates the card', async () => {
        mockEventLoad()
        vi.spyOn(SlackProposalDao, 'getProposal').mockResolvedValue(pendingRecord)
        const statusSpy = vi.spyOn(SlackProposalDao, 'updateStatus').mockResolvedValue()
        const auditSpy = vi.spyOn(AiActionDao, 'addAction').mockResolvedValue('a1')
        fetchSpy.mockResolvedValue(slackOk())

        const originalInject = fastify.inject.bind(fastify)
        const injectSpy = vi
            .spyOn(fastify, 'inject')
            .mockImplementation(((opts: { url: string }) =>
                opts.url.includes('/speakers/s1')
                    ? Promise.resolve({ statusCode: 200, body: '' })
                    : originalInject(opts as never)) as never)

        const raw = interaction(SLACK_ACTION_IDS.applyProposal, `${eventId}|call_1`)
        const res = await fastify.inject({
            method: 'POST',
            url: interactionsUrl,
            headers: signedHeaders(raw, 'application/x-www-form-urlencoded'),
            payload: raw,
        })
        expect(res.statusCode).toBe(200)

        const replay = injectSpy.mock.calls.find(([opts]) =>
            (opts as { url: string }).url.includes('/speakers/s1')
        )?.[0]
        expect(replay).toMatchObject({
            method: 'PATCH',
            url: `/v1/${eventId}/speakers/s1?apiKey=op_key`,
            payload: { name: 'Alicia' },
        })
        expect(statusSpy).toHaveBeenCalledWith(expect.anything(), eventId, 'call_1', { status: 'applied' })
        expect(auditSpy.mock.calls[0][2]).toMatchObject({ tool: 'patchSpeaker', applied: true, rejected: false })

        const update = JSON.parse(String(fetchSpy.mock.calls[0][1].body))
        expect(update.ts).toBe('200.2')
        expect(update.text).toBe('✅ Applied: Update speaker Alice')
    })

    test('Reject button never hits the API and marks the proposal rejected', async () => {
        mockEventLoad()
        vi.spyOn(SlackProposalDao, 'getProposal').mockResolvedValue(pendingRecord)
        const statusSpy = vi.spyOn(SlackProposalDao, 'updateStatus').mockResolvedValue()
        const auditSpy = vi.spyOn(AiActionDao, 'addAction').mockResolvedValue('a1')
        fetchSpy.mockResolvedValue(slackOk())

        const raw = interaction(SLACK_ACTION_IDS.rejectProposal, `${eventId}|call_1`)
        await fastify.inject({
            method: 'POST',
            url: interactionsUrl,
            headers: signedHeaders(raw, 'application/x-www-form-urlencoded'),
            payload: raw,
        })
        expect(statusSpy).toHaveBeenCalledWith(expect.anything(), eventId, 'call_1', { status: 'rejected' })
        expect(auditSpy.mock.calls[0][2]).toMatchObject({ applied: false, rejected: true })
    })
})
