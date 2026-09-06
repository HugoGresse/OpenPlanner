import { SlackThreadMessage } from './slackFormat'

const SLACK_API_URL = 'https://slack.com/api'

type SlackApiResponse = { ok: boolean; error?: string; [key: string]: unknown }

const slackCall = async (token: string, method: string, body: Record<string, unknown>): Promise<SlackApiResponse> => {
    const response = await fetch(`${SLACK_API_URL}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    })
    const json = (await response.json().catch(() => ({ ok: false, error: 'invalid_json' }))) as SlackApiResponse
    if (!json.ok) {
        throw new Error(`Slack ${method} failed: ${json.error ?? response.statusText}`)
    }
    return json
}

export type SlackMessageRef = { channel: string; ts: string }

export type PostMessageArgs = {
    channel: string
    threadTs?: string
    text: string
    blocks?: object[]
}

export const postSlackMessage = async (token: string, args: PostMessageArgs): Promise<SlackMessageRef> => {
    const json = await slackCall(token, 'chat.postMessage', {
        channel: args.channel,
        thread_ts: args.threadTs,
        text: args.text,
        blocks: args.blocks,
    })
    return { channel: String(json.channel), ts: String(json.ts) }
}

export type UpdateMessageArgs = SlackMessageRef & { text: string; blocks?: object[] }

export const updateSlackMessage = async (token: string, args: UpdateMessageArgs): Promise<void> => {
    await slackCall(token, 'chat.update', {
        channel: args.channel,
        ts: args.ts,
        text: args.text,
        // Slack keeps existing blocks on chat.update unless explicitly cleared.
        blocks: args.blocks ?? [],
    })
}

export const fetchSlackThreadReplies = async (
    token: string,
    channel: string,
    threadTs: string,
    limit = 50
): Promise<SlackThreadMessage[]> => {
    const json = await slackCall(token, 'conversations.replies', { channel, ts: threadTs, limit })
    return Array.isArray(json.messages) ? (json.messages as SlackThreadMessage[]) : []
}

export const testSlackToken = async (token: string): Promise<{ botUserId: string; team: string }> => {
    const json = await slackCall(token, 'auth.test', {})
    return { botUserId: String(json.user_id ?? ''), team: String(json.team ?? '') }
}

export type SlackOAuthResult = {
    botToken: string
    botUserId: string
    teamId: string
    teamName: string
    authedUserId: string | null
}

export const exchangeSlackOAuthCode = async (
    clientId: string,
    clientSecret: string,
    code: string
): Promise<SlackOAuthResult> => {
    const response = await fetch(`${SLACK_API_URL}/oauth.v2.access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code }).toString(),
    })
    const json = (await response.json().catch(() => ({ ok: false, error: 'invalid_json' }))) as SlackApiResponse & {
        access_token?: string
        bot_user_id?: string
        team?: { id?: string; name?: string }
        authed_user?: { id?: string }
    }
    if (!json.ok || !json.access_token || !json.team?.id) {
        throw new Error(`Slack oauth.v2.access failed: ${json.error ?? 'missing token'}`)
    }
    return {
        botToken: json.access_token,
        botUserId: String(json.bot_user_id ?? ''),
        teamId: json.team.id,
        teamName: String(json.team.name ?? ''),
        authedUserId: json.authed_user?.id ?? null,
    }
}

export type SlackChannel = { id: string; name: string; isPrivate: boolean }

export const listSlackChannels = async (token: string): Promise<SlackChannel[]> => {
    const json = await slackCall(token, 'conversations.list', {
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 500,
    })
    const channels = Array.isArray(json.channels) ? (json.channels as Array<Record<string, unknown>>) : []
    return channels
        .map((c) => ({ id: String(c.id ?? ''), name: String(c.name ?? ''), isPrivate: c.is_private === true }))
        .filter((c) => c.id && c.name)
        .sort((a, b) => a.name.localeCompare(b.name))
}
