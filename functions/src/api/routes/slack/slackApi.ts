import { SlackThreadMessage } from './slackFormat'

const SLACK_API_URL = 'https://slack.com/api'
// Slack caps conversations.replies at 15 per page for apps created after May 2025.
const REPLIES_PAGE_SIZE = 15
const REPLIES_MAX_PAGES = 14

type SlackApiResponse = { ok: boolean; error?: string; [key: string]: unknown }

export class SlackApiError extends Error {
    constructor(method: string, public readonly slackError: string, public readonly retryAfterSeconds?: number) {
        super(`Slack ${method} failed: ${slackError}`)
    }
}

const slackCall = async (token: string, method: string, body: Record<string, unknown>): Promise<SlackApiResponse> => {
    const response = await fetch(`${SLACK_API_URL}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    })
    const json = (await response.json().catch(() => ({ ok: false, error: 'invalid_json' }))) as SlackApiResponse
    if (!json.ok) {
        const retryAfter = Number(response.headers.get('retry-after'))
        throw new SlackApiError(
            method,
            json.error ?? response.statusText,
            Number.isFinite(retryAfter) ? retryAfter : undefined
        )
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const updateSlackMessageWithRetry = async (token: string, args: UpdateMessageArgs): Promise<void> => {
    try {
        await updateSlackMessage(token, args)
    } catch (error) {
        const retryAfter =
            error instanceof SlackApiError && error.slackError === 'ratelimited' ? error.retryAfterSeconds : undefined
        await sleep(Math.min((retryAfter ?? 2) * 1000, 10_000))
        await updateSlackMessage(token, args)
    }
}

// conversations.replies pages oldest → newest; walk the pages and keep the newest messages.
export const fetchSlackThreadReplies = async (
    token: string,
    channel: string,
    threadTs: string,
    maxMessages = 100
): Promise<SlackThreadMessage[]> => {
    const messages: SlackThreadMessage[] = []
    let cursor: string | undefined
    for (let page = 0; page < REPLIES_MAX_PAGES; page++) {
        const json = await slackCall(token, 'conversations.replies', {
            channel,
            ts: threadTs,
            limit: REPLIES_PAGE_SIZE,
            cursor,
        })
        if (Array.isArray(json.messages)) messages.push(...(json.messages as SlackThreadMessage[]))
        cursor = (json.response_metadata as { next_cursor?: string } | undefined)?.next_cursor || undefined
        if (!cursor) break
    }
    return messages.slice(-maxMessages)
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
