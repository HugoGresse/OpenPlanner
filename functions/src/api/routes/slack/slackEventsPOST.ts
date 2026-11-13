import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { EventDao } from '../../dao/eventDao'
import { SlackInstallationDao } from '../../dao/slackInstallationDao'
import { SlackInboundEvent } from './slackChatHandler'
import { dispatchSlackWork } from './slackWorker'

type SlackEventsBody = {
    type?: string
    challenge?: string
    team_id?: string
    event?: SlackInboundEvent
    authorizations?: Array<{ user_id?: string }>
}

const eventIdParam = { type: 'object', properties: { eventId: { type: 'string' } }, required: ['eventId'] }

export const slackEventsPOSTSchema = {
    tags: ['slack'],
    summary: 'Slack Events API endpoint for a self-managed Slack app (app_mention + DMs)',
    description:
        'For self-hosters using their own Slack app: set this URL as the Event Subscriptions Request URL. Requests are verified with the Slack signing secret stored on the event. Mention the bot (or DM it) to chat with the OpenPlanner assistant; write proposals come back as Apply / Reject buttons.',
    params: eventIdParam,
}

export const slackOfficialEventsPOSTSchema = {
    tags: ['slack'],
    summary: 'Slack Events API endpoint for the official OpenPlanner Slack app',
    description:
        'Single Request URL for the OpenPlanner Slack app. Verified with SLACK_SIGNING_SECRET; messages are routed to the OpenPlanner event linked to the workspace (and channel, when several events share a workspace).',
}

export const shouldHandleSlackEvent = (
    event: SlackInboundEvent | undefined,
    botUserId: string | undefined
): boolean => {
    if (!event || event.bot_id || event.subtype || !event.text?.trim()) return false
    if (event.type === 'app_mention') return true
    if (event.type !== 'message' || event.channel_type !== 'im') return false
    return !botUserId || !event.text.includes(`<@${botUserId}>`)
}

type InboundDecision =
    | { kind: 'reply'; body: Record<string, unknown> }
    | { kind: 'uninstalled'; teamId: string }
    | { kind: 'message'; inbound: SlackInboundEvent; botUserId: string | undefined; teamId: string | undefined }

const UNINSTALL_EVENT_TYPES = new Set(['app_uninstalled', 'tokens_revoked'])

// Work is acked immediately, so a redelivery means the first ack was lost in transit;
// the original delivery is still queued, so retries are acknowledged and dropped.
export const decideInbound = (request: FastifyRequest): InboundDecision => {
    const body = (request.body ?? {}) as SlackEventsBody
    if (body.type === 'url_verification') return { kind: 'reply', body: { challenge: body.challenge } }
    if (request.headers['x-slack-retry-num']) return { kind: 'reply', body: { ok: true, ignored: 'retry' } }
    if (body.type !== 'event_callback' || !body.event) return { kind: 'reply', body: { ok: true } }
    if (UNINSTALL_EVENT_TYPES.has(body.event.type) && body.team_id) {
        return { kind: 'uninstalled', teamId: body.team_id }
    }
    const botUserId = body.authorizations?.[0]?.user_id
    if (!shouldHandleSlackEvent(body.event, botUserId)) return { kind: 'reply', body: { ok: true } }
    return { kind: 'message', inbound: body.event, botUserId, teamId: body.team_id }
}

const forgetInstallation = async (fastify: FastifyInstance, teamId: string) => {
    await SlackInstallationDao.deleteInstallation(fastify.firebase, teamId)
    const events = await EventDao.getEventsBySlackTeamId(fastify.firebase, teamId)
    await Promise.all(
        events.map((event) =>
            EventDao.patchEvent(fastify.firebase, event.id, {
                slackTeamId: null,
                slackTeamName: null,
                slackChannelId: null,
                slackChannelName: null,
            })
        )
    )
}

export const slackEventsRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Params: { eventId: string } }>, reply: FastifyReply) => {
        const decision = decideInbound(request)
        if (decision.kind === 'reply') return reply.status(200).send(decision.body)
        if (decision.kind !== 'message') return reply.status(200).send({ ok: true })

        await dispatchSlackWork(fastify, {
            type: 'chat',
            source: { kind: 'event', eventId: request.openPlannerEvent.id },
            inbound: decision.inbound,
            botUserId: decision.botUserId,
        })
        return reply.status(200).send({ ok: true })
    }
}

export const slackOfficialEventsRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const decision = decideInbound(request)
        if (decision.kind === 'reply') return reply.status(200).send(decision.body)
        if (decision.kind === 'uninstalled') {
            await forgetInstallation(fastify, decision.teamId).catch((error) =>
                console.error('[slack events] uninstall cleanup failed', error)
            )
            return reply.status(200).send({ ok: true })
        }
        if (!decision.teamId) return reply.status(200).send({ ok: true })

        await dispatchSlackWork(fastify, {
            type: 'chat',
            source: { kind: 'official', teamId: decision.teamId },
            inbound: decision.inbound,
            botUserId: decision.botUserId,
        })
        return reply.status(200).send({ ok: true })
    }
}
