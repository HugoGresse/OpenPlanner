import { createHmac, timingSafeEqual } from 'node:crypto'

export const SLACK_SIGNATURE_MAX_AGE_SECONDS = 300

export const computeSlackSignature = (signingSecret: string, timestamp: string, rawBody: string): string =>
    'v0=' + createHmac('sha256', signingSecret).update(`v0:${timestamp}:${rawBody}`).digest('hex')

export type VerifySlackSignatureArgs = {
    signingSecret: string
    timestamp: string | undefined
    signature: string | undefined
    rawBody: string
    nowMs?: number
}

export const verifySlackSignature = ({
    signingSecret,
    timestamp,
    signature,
    rawBody,
    nowMs = Date.now(),
}: VerifySlackSignatureArgs): boolean => {
    if (!signingSecret || !timestamp || !signature) return false
    const ts = Number(timestamp)
    if (!Number.isFinite(ts)) return false
    if (Math.abs(nowMs / 1000 - ts) > SLACK_SIGNATURE_MAX_AGE_SECONDS) return false

    const encoder = new TextEncoder()
    const expected = encoder.encode(computeSlackSignature(signingSecret, timestamp, rawBody))
    const received = encoder.encode(signature)
    if (expected.length !== received.length) return false
    return timingSafeEqual(expected, received)
}
