import { describe, expect, test } from 'vitest'
import { computeSlackSignature, verifySlackSignature } from './slackSignature'

const secret = '8f742231b10e8888abcd99yyyzzz85a5'
const body = 'token=xyzz0WbapA4vBCDEFasx0q6G&team_id=T1DC2JH3J&command=%2Fweather'
const timestamp = '1531420618'
const nowMs = Number(timestamp) * 1000 + 10_000

describe('verifySlackSignature', () => {
    test('accepts a signature computed with the same secret', () => {
        const signature = computeSlackSignature(secret, timestamp, body)
        expect(signature).toMatch(/^v0=[0-9a-f]{64}$/)
        expect(verifySlackSignature({ signingSecret: secret, timestamp, signature, rawBody: body, nowMs })).toBe(true)
        expect(verifySlackSignature({ signingSecret: 'other', timestamp, signature, rawBody: body, nowMs })).toBe(false)
    })

    test('rejects a tampered body', () => {
        const signature = computeSlackSignature(secret, timestamp, body)
        expect(verifySlackSignature({ signingSecret: secret, timestamp, signature, rawBody: body + 'x', nowMs })).toBe(
            false
        )
    })

    test('rejects a stale timestamp (replay)', () => {
        const signature = computeSlackSignature(secret, timestamp, body)
        const sixMinutesLater = nowMs + 6 * 60 * 1000
        expect(
            verifySlackSignature({ signingSecret: secret, timestamp, signature, rawBody: body, nowMs: sixMinutesLater })
        ).toBe(false)
    })

    test('rejects missing headers and length mismatch without throwing', () => {
        expect(
            verifySlackSignature({ signingSecret: secret, timestamp: undefined, signature: 'v0=a', rawBody: body })
        ).toBe(false)
        expect(
            verifySlackSignature({ signingSecret: secret, timestamp, signature: 'v0=short', rawBody: body, nowMs })
        ).toBe(false)
    })
})
