import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { request as httpsRequest } from 'node:https'
import { EventDao } from '../../dao/eventDao'
import { SlackInstallationDao } from '../../dao/slackInstallationDao'
import { postSlackMessage } from './slackApi'
import { SlackChatContext, SlackInboundEvent, handleSlackChatMessage } from './slackChatHandler'
import { SlackInteractionPayload, runSlackInteraction } from './slackInteractionsPOST'
import { describeSlackPickFailure, pickEventForSlackChannel } from './slackRouting'
import { computeSlackSignature, verifySlackSignature } from './slackSignature'

export const SLACK_WORK_PATH = '/v1/slack/work'
const TIMESTAMP_HEADER = 'x-openplanner-timestamp'
const SIGNATURE_HEADER = 'x-openplanner-signature'

export type SlackWorkSource = { kind: 'event'; eventId: string } | { kind: 'official'; teamId: string }

export type SlackWork =
    | { type: 'chat'; source: SlackWorkSource; inbound: SlackInboundEvent; botUserId?: string }
    | { type: 'interaction'; source: SlackWorkSource; payload: SlackInteractionPayload }

const resolveChatContext = async (
    fastify: FastifyInstance,
    work: Extract<SlackWork, { type: 'chat' }>
): Promise<SlackChatContext | null> => {
    const { source, inbound, botUserId } = work
    if (source.kind === 'event') {
        const event = await EventDao.getEvent(fastify.firebase, source.eventId)
        if (!event.slackBotToken) {
            console.warn('[slack worker] bot token missing', { eventId: event.id })
            return null
        }
        return { event, botToken: event.slackBotToken, botUserId, credential: 'event', inbound }
    }

    const installation = await SlackInstallationDao.getInstallation(fastify.firebase, source.teamId)
    if (!installation) {
        console.warn('[slack worker] no installation for team', { teamId: source.teamId })
        return null
    }
    const events = await EventDao.getEventsBySlackTeamId(fastify.firebase, source.teamId)
    const pick = pickEventForSlackChannel(events, inbound.channel)
    if (pick.kind !== 'event') {
        await postSlackMessage(installation.botToken, {
            channel: inbound.channel,
            threadTs: inbound.thread_ts ?? inbound.ts,
            text: describeSlackPickFailure(pick),
        })
        return null
    }
    return {
        event: pick.event,
        botToken: installation.botToken,
        botUserId: botUserId ?? installation.botUserId,
        credential: 'installation',
        inbound,
    }
}

export const runSlackWork = async (fastify: FastifyInstance, work: SlackWork): Promise<void> => {
    if (work.type === 'interaction') {
        await runSlackInteraction(fastify, work.source, work.payload)
        return
    }
    const context = await resolveChatContext(fastify, work)
    if (!context) return
    console.info('[slack worker] handling chat', { eventId: context.event.id, type: work.inbound.type })
    await handleSlackChatMessage(fastify, context)
}

const runInline = (fastify: FastifyInstance, work: SlackWork) =>
    runSlackWork(fastify, work).catch((error) => console.error('[slack worker] failed', error))

const runsInline = () =>
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    process.env.FUNCTIONS_EMULATOR === 'true'

// Cloud Functions v2 exposes the api function at this URL; the path prefix is stripped before Fastify.
const selfBaseUrl = () =>
    (process.env.API_SELF_URL || `https://europe-west1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/api`).replace(
        /\/+$/,
        ''
    )

// Resolves once the request is flushed to the socket. The response is deliberately not awaited: the
// receiving request owns its own invocation and does the work, while this one goes back to ack Slack.
const sendSelfRequest = (url: URL, body: string, headers: Record<string, string>): Promise<void> =>
    new Promise((resolve, reject) => {
        const req = httpsRequest(url, {
            method: 'POST',
            headers: { ...headers, 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
        })
        req.on('error', reject)
        req.on('response', (response) => response.resume())
        req.on('finish', () => resolve())
        req.end(body)
    })

// Slack expects an ack within 3s and the Cloud Functions invocation ends when the socket closes, so the
// real work is handed to a second request on this same (warm) api service, signed with SERVICE_API_KEY.
export const dispatchSlackWork = async (fastify: FastifyInstance, work: SlackWork): Promise<void> => {
    const secret = process.env.SERVICE_API_KEY
    if (runsInline() || !secret) {
        if (!secret) console.error('[slack worker] SERVICE_API_KEY is not set, running Slack work inline')
        await runInline(fastify, work)
        return
    }
    const body = JSON.stringify(work)
    const timestamp = String(Math.floor(Date.now() / 1000))
    const headers = {
        [TIMESTAMP_HEADER]: timestamp,
        [SIGNATURE_HEADER]: computeSlackSignature(secret, timestamp, body),
    }
    await sendSelfRequest(new URL(`${selfBaseUrl()}${SLACK_WORK_PATH}`), body, headers).catch((error) => {
        console.error('[slack worker] self dispatch failed, running inline', error)
        return runInline(fastify, work)
    })
}

export const verifySlackWorkRequest = async (request: FastifyRequest, reply: FastifyReply) => {
    const secret = process.env.SERVICE_API_KEY
    const valid =
        Boolean(secret) &&
        verifySlackSignature({
            signingSecret: secret as string,
            timestamp: request.headers[TIMESTAMP_HEADER] as string | undefined,
            signature: request.headers[SIGNATURE_HEADER] as string | undefined,
            rawBody: request.slackRawBody ?? '',
        })
    if (!valid) reply.status(401).send({ error: 'Invalid work signature' })
}

export const slackWorkRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        await runInline(fastify, request.body as SlackWork)
        return reply.status(200).send({ ok: true })
    }
}
