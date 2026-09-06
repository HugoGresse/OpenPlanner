import { describe, expect, test } from 'vitest'
import { decodeSlackOAuthState, encodeSlackOAuthState } from './slackOAuthState'
import { isAllowedReturnTo } from './slackConfig'

const secret = 'client-secret'
const now = 1_700_000_000_000
const state = { eventId: 'evt-1', returnTo: 'https://openplanner.fr/events/evt-1/api', exp: now + 60_000 }

describe('Slack OAuth state', () => {
    test('round-trips a signed state', () => {
        expect(decodeSlackOAuthState(secret, encodeSlackOAuthState(secret, state), now)).toEqual(state)
    })

    test('rejects tampering, wrong secret, expiry and garbage', () => {
        const encoded = encodeSlackOAuthState(secret, state)
        const [payload, signature] = encoded.split('.')
        const tampered = Buffer.from(JSON.stringify({ ...state, eventId: 'evt-2' })).toString('base64url')
        expect(decodeSlackOAuthState(secret, `${tampered}.${signature}`, now)).toBeNull()
        expect(decodeSlackOAuthState('other', encoded, now)).toBeNull()
        expect(decodeSlackOAuthState(secret, encoded, state.exp + 1)).toBeNull()
        expect(decodeSlackOAuthState(secret, payload, now)).toBeNull()
        expect(decodeSlackOAuthState(secret, undefined, now)).toBeNull()
    })
})

describe('isAllowedReturnTo', () => {
    test('accepts the public app origin and localhost only', () => {
        expect(isAllowedReturnTo('https://openplanner.fr/events/x/api', 'https://openplanner.fr/')).toBe(true)
        expect(isAllowedReturnTo('http://localhost:3008/events/x/api', 'https://openplanner.fr')).toBe(true)
        expect(isAllowedReturnTo('https://openplanner.fr.evil.com/x', 'https://openplanner.fr')).toBe(false)
        expect(isAllowedReturnTo('https://evil.com/', undefined)).toBe(false)
    })
})
