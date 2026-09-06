import { createHmac, timingSafeEqual } from 'node:crypto'

export const SLACK_OAUTH_STATE_TTL_MS = 10 * 60 * 1000

export type SlackOAuthState = {
    eventId: string
    returnTo: string
    exp: number
}

const sign = (secret: string, payload: string) => createHmac('sha256', secret).update(payload).digest('base64url')

export const encodeSlackOAuthState = (secret: string, state: SlackOAuthState): string => {
    const payload = Buffer.from(JSON.stringify(state)).toString('base64url')
    return `${payload}.${sign(secret, payload)}`
}

export const decodeSlackOAuthState = (
    secret: string,
    raw: string | undefined,
    nowMs = Date.now()
): SlackOAuthState | null => {
    if (!raw) return null
    const [payload, signature] = raw.split('.')
    if (!payload || !signature) return null
    const encoder = new TextEncoder()
    const expected = encoder.encode(sign(secret, payload))
    const received = encoder.encode(signature)
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null
    try {
        const state = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SlackOAuthState
        if (typeof state.eventId !== 'string' || typeof state.returnTo !== 'string') return null
        if (typeof state.exp !== 'number' || state.exp < nowMs) return null
        return state
    } catch {
        return null
    }
}
