import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { Event } from '../../../types'
import { EventDao } from '../../dao/eventDao'
import { AiActionDao } from '../../dao/aiActionDao'
import { SlackInstallationDao } from '../../dao/slackInstallationDao'
import { SlackProposalDao, SlackProposalRecord } from '../../dao/slackProposalDao'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { computeSlackSignature } from './slackSignature'
import { SLACK_ACTION_IDS } from './slackFormat'
import { decodeSlackOAuthState } from './slackOAuthState'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((_fastify, _options, next) => next()),
    }
})

const teamId = 'T123'
const signingSecret = 'official-signing'
const clientSecret = 'official-client-secret'
const installation = {
    teamId,
    teamName: 'Acme',
    botToken: 'xoxb-official',
    botUserId: 'U0BOT',
    installedByUserId: 'U9',
}

const makeEvent = (overrides: Partial<Event>): Event =>
    ({
        name: 'Evt',
        apiKey: 'op_key',
        openRouterAPIKey: 'or-test',
        slackTeamId: teamId,
        dates: { start: null, end: null },
        ...overrides,
    } as Event)

const signed = (rawBody: string, contentType: string) => {
    const timestamp = String(Math.floor(Date.now() / 1000))
    return {
        'content-type': contentType,
        'x-slack-request-timestamp': timestamp,
        'x-slack-signature': computeSlackSignature(signingSecret, timestamp, rawBody),
    }
}

const slackOk = (extra: object = {}) => new Response(JSON.stringify({ ok: true, ...extra }), { status: 200 })

const mention = (channel: string) =>
    JSON.stringify({
        type: 'event_callback',
        team_id: teamId,
        authorizations: [{ user_id: 'U0BOT' }],
        event: { type: 'app_mention', channel, user: 'U1', text: '<@U0BOT> hi', ts: '1.1' },
    })

describe('Official Slack app routes', () => {
    const fastify = setupFastify()
    let fetchSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
        process.env.SLACK_CLIENT_ID = 'client-id'
        process.env.SLACK_CLIENT_SECRET = clientSecret
        process.env.SLACK_SIGNING_SECRET = signingSecret
        process.env.PUBLIC_APP_URL = 'https://openplanner.fr'
        fetchSpy = vi.fn()
        globalThis.fetch = fetchSpy as unknown as typeof fetch
    })

    afterEach(() => {
        delete process.env.SLACK_CLIENT_ID
        delete process.env.SLACK_CLIENT_SECRET
        delete process.env.SLACK_SIGNING_SECRET
        vi.restoreAllMocks()
    })

    test('GET /v1/slack/config reflects env configuration', async () => {
        expect((await fastify.inject({ method: 'GET', url: '/v1/slack/config' })).json()).toEqual({ officialApp: true })
        delete process.env.SLACK_CLIENT_ID
        expect((await fastify.inject({ method: 'GET', url: '/v1/slack/config' })).json()).toEqual({
            officialApp: false,
        })
    })

    test('install redirects to Slack with a signed state, rejects foreign returnTo', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() =>
            getMockedFirestore({ id: 'evt-1', apiKey: 'op_key' })
        )
        const res = await fastify.inject({
            method: 'GET',
            url: '/v1/evt-1/slack/install?apiKey=op_key&returnTo=https%3A%2F%2Fopenplanner.fr%2Fevents%2Fevt-1%2Fapi',
        })
        expect(res.statusCode).toBe(302)
        const location = new URL(res.headers.location as string)
        expect(location.origin + location.pathname).toBe('https://slack.com/oauth/v2/authorize')
        expect(location.searchParams.get('client_id')).toBe('client-id')
        expect(location.searchParams.get('scope')).toContain('chat:write')
        expect(decodeSlackOAuthState(clientSecret, location.searchParams.get('state') ?? undefined)).toMatchObject({
            eventId: 'evt-1',
            returnTo: 'https://openplanner.fr/events/evt-1/api',
        })

        const foreign = await fastify.inject({
            method: 'GET',
            url: '/v1/evt-1/slack/install?apiKey=op_key&returnTo=https%3A%2F%2Fevil.com%2F',
        })
        expect(foreign.statusCode).toBe(400)
    })

    test('callback exchanges the code, stores the install, links the event and redirects back', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() =>
            getMockedFirestore({ id: 'evt-1', apiKey: 'op_key' })
        )
        const install = await fastify.inject({
            method: 'GET',
            url: '/v1/evt-1/slack/install?apiKey=op_key&returnTo=https%3A%2F%2Fopenplanner.fr%2Fevents%2Fevt-1%2Fapi',
        })
        const state = new URL(install.headers.location as string).searchParams.get('state') as string

        fetchSpy.mockResolvedValue(
            slackOk({
                access_token: 'xoxb-new',
                bot_user_id: 'U0BOT',
                team: { id: teamId, name: 'Acme' },
                authed_user: { id: 'U9' },
            })
        )
        const saveSpy = vi.spyOn(SlackInstallationDao, 'saveInstallation').mockResolvedValue()
        const patchSpy = vi.spyOn(EventDao, 'patchEvent').mockResolvedValue()

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/slack/oauth/callback?code=abc&state=${encodeURIComponent(state)}`,
        })
        expect(res.statusCode).toBe(302)
        expect(res.headers.location).toBe('https://openplanner.fr/events/evt-1/api?slack=connected')
        expect(String(fetchSpy.mock.calls[0][1].body)).toContain('code=abc')
        expect(saveSpy.mock.calls[0][1]).toMatchObject({
            teamId,
            teamName: 'Acme',
            botToken: 'xoxb-new',
            botUserId: 'U0BOT',
        })
        expect(patchSpy).toHaveBeenCalledWith(expect.anything(), 'evt-1', {
            slackTeamId: teamId,
            slackTeamName: 'Acme',
            slackChannelId: null,
            slackChannelName: null,
        })

        const bad = await fastify.inject({ method: 'GET', url: '/v1/slack/oauth/callback?code=abc&state=nope' })
        expect(bad.statusCode).toBe(400)
    })

    test('official events: routes a mention to the event assigned to the channel', async () => {
        vi.spyOn(SlackInstallationDao, 'getInstallation').mockResolvedValue(installation)
        vi.spyOn(EventDao, 'getEventsBySlackTeamId').mockResolvedValue([
            makeEvent({ id: 'evt-a', name: 'A', slackChannelId: 'C-A', openRouterAPIKey: null }),
            makeEvent({ id: 'evt-b', name: 'B', slackChannelId: 'C-B', openRouterAPIKey: null }),
        ])
        fetchSpy.mockResolvedValue(slackOk({ channel: 'C-B', ts: '2.2' }))

        const raw = mention('C-B')
        const res = await fastify.inject({
            method: 'POST',
            url: '/v1/slack/events',
            headers: signed(raw, 'application/json'),
            payload: raw,
        })
        expect(res.statusCode).toBe(200)
        const [url, init] = fetchSpy.mock.calls[0]
        expect(String(url)).toContain('chat.postMessage')
        expect(init.headers.Authorization).toBe('Bearer xoxb-official')
        const body = JSON.parse(String(init.body))
        expect(body.channel).toBe('C-B')
        expect(body.text).toContain('"B"')
    })

    test('official events: explains how to link when several events are ambiguous, 401 on bad signature', async () => {
        vi.spyOn(SlackInstallationDao, 'getInstallation').mockResolvedValue(installation)
        vi.spyOn(EventDao, 'getEventsBySlackTeamId').mockResolvedValue([
            makeEvent({ id: 'evt-a', name: 'Alpha' }),
            makeEvent({ id: 'evt-b', name: 'Beta' }),
        ])
        fetchSpy.mockResolvedValue(slackOk({ channel: 'C-X', ts: '2.2' }))

        const raw = mention('C-X')
        await fastify.inject({
            method: 'POST',
            url: '/v1/slack/events',
            headers: signed(raw, 'application/json'),
            payload: raw,
        })
        const body = JSON.parse(String(fetchSpy.mock.calls[0][1].body))
        expect(body.text).toContain('Alpha')
        expect(body.text).toContain('Beta')

        const bad = await fastify.inject({
            method: 'POST',
            url: '/v1/slack/events',
            headers: { ...signed(raw, 'application/json'), 'x-slack-signature': 'v0=bad' },
            payload: raw,
        })
        expect(bad.statusCode).toBe(401)
    })

    test('official events: app_uninstalled drops the installation', async () => {
        const deleteSpy = vi.spyOn(SlackInstallationDao, 'deleteInstallation').mockResolvedValue()
        const raw = JSON.stringify({ type: 'event_callback', team_id: teamId, event: { type: 'app_uninstalled' } })
        await fastify.inject({
            method: 'POST',
            url: '/v1/slack/events',
            headers: signed(raw, 'application/json'),
            payload: raw,
        })
        expect(deleteSpy).toHaveBeenCalledWith(expect.anything(), teamId)
    })

    test('official interactions: Apply resolves the event from the button value and uses the install token', async () => {
        const record: SlackProposalRecord = {
            id: 'call_1',
            batchId: '2.2',
            status: 'pending',
            channel: 'C-A',
            threadTs: '1.1',
            messageTs: '3.3',
            prompt: 'p',
            model: 'm',
            proposal: {
                kind: 'patchSpeaker',
                summary: 'Update speaker Alice',
                endpoint: { method: 'PATCH', path: '/v1/evt-a/speakers/s1', body: { name: 'Alicia' } },
                target: { id: 's1', label: 'Alice' },
                diff: { before: { name: 'Alice' }, after: { name: 'Alicia' } },
            },
        }
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue(makeEvent({ id: 'evt-a' }))
        vi.spyOn(SlackInstallationDao, 'getInstallation').mockResolvedValue(installation)
        vi.spyOn(SlackProposalDao, 'getProposal').mockResolvedValue(record)
        const statusSpy = vi.spyOn(SlackProposalDao, 'updateStatus').mockResolvedValue()
        vi.spyOn(AiActionDao, 'addAction').mockResolvedValue('a1')
        fetchSpy.mockResolvedValue(slackOk())
        const originalInject = fastify.inject.bind(fastify)
        vi.spyOn(fastify, 'inject').mockImplementation(((opts: { url: string }) =>
            opts.url.includes('/speakers/s1')
                ? Promise.resolve({ statusCode: 200, body: '' })
                : originalInject(opts as never)) as never)

        const raw =
            'payload=' +
            encodeURIComponent(
                JSON.stringify({
                    type: 'block_actions',
                    user: { id: 'U1' },
                    team: { id: teamId },
                    actions: [{ action_id: SLACK_ACTION_IDS.applyProposal, value: 'evt-a|call_1' }],
                })
            )
        const res = await fastify.inject({
            method: 'POST',
            url: '/v1/slack/interactions',
            headers: signed(raw, 'application/x-www-form-urlencoded'),
            payload: raw,
        })
        expect(res.statusCode).toBe(200)
        expect(statusSpy).toHaveBeenCalledWith(expect.anything(), 'evt-a', 'call_1', { status: 'applied' })
        const [, init] = fetchSpy.mock.calls[0]
        expect(init.headers.Authorization).toBe('Bearer xoxb-official')
        expect(JSON.parse(String(init.body)).ts).toBe('3.3')
    })

    test('official interactions: ignores actions whose event is linked to another workspace', async () => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue(makeEvent({ id: 'evt-a', slackTeamId: 'T-OTHER' }))
        const getProposal = vi.spyOn(SlackProposalDao, 'getProposal').mockResolvedValue(null)
        const raw =
            'payload=' +
            encodeURIComponent(
                JSON.stringify({
                    type: 'block_actions',
                    user: { id: 'U1' },
                    team: { id: teamId },
                    actions: [{ action_id: SLACK_ACTION_IDS.applyProposal, value: 'evt-a|call_1' }],
                })
            )
        await fastify.inject({
            method: 'POST',
            url: '/v1/slack/interactions',
            headers: signed(raw, 'application/x-www-form-urlencoded'),
            payload: raw,
        })
        expect(getProposal).not.toHaveBeenCalled()
    })
})
