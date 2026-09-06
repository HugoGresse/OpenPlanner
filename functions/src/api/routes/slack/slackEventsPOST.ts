import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { EventDao } from '../../dao/eventDao'
import { SlackInstallationDao } from '../../dao/slackInstallationDao'
import { postSlackMessage } from './slackApi'
import { SlackInboundEvent, handleSlackChatMessage } from './slackChatHandler'
import { describeSlackPickFailure, pickEventForSlackChannel } from './slackRouting'

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
    | { kind: 'challenge'; challenge: string | undefined }
    | { kind: 'ignore'; payload: Record<string, unknown> }
    | { kind: 'uninstalled'; teamId: string }
    | { kind: 'message'; inbound: SlackInboundEvent; botUserId: string | undefined; teamId: string | undefined }

const UNINSTALL_EVENT_TYPES = new Set(['app_uninstalled', 'tokens_revoked'])

// Slack redelivers when we take longer than 3s to answer; the original delivery
// is still being processed, so retries are acknowledged and dropped.
export const decideInbound = (request: FastifyRequest): InboundDecision => {
    const body = (request.body ?? {}) as SlackEventsBody
    if (body.type === 'url_verification') return { kind: 'challenge', challenge: body.challenge }
    if (request.headers['x-slack-retry-num']) return { kind: 'ignore', payload: { ok: true, ignored: 'retry' } }
    if (body.type !== 'event_callback' || !body.event) return { kind: 'ignore', payload: { ok: true } }
    if (UNINSTALL_EVENT_TYPES.has(body.event.type) && body.team_id) {
        return { kind: 'uninstalled', teamId: body.team_id }
    }
    const botUserId = body.authorizations?.[0]?.user_id
    if (!shouldHandleSlackEvent(body.event, botUserId)) return { kind: 'ignore', payload: { ok: true } }
    return { kind: 'message', inbound: body.event, botUserId, teamId: body.team_id }
}

export const slackEventsRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Params: { eventId: string } }>, reply: FastifyReply) => {
        const decision = decideInbound(request)
        if (decision.kind === 'challenge') return reply.status(200).send({ challenge: decision.challenge })
        if (decision.kind === 'ignore') return reply.status(200).send(decision.payload)
        if (decision.kind !== 'message') return reply.status(200).send({ ok: true })

        const event = request.openPlannerEvent
        if (!event.slackBotToken) {
            console.warn('[slack events] bot token missing', { eventId: event.id })
            return reply.status(200).send({ ok: true })
        }
        console.info('[slack events] handling', { eventId: event.id, type: decision.inbound.type })
        try {
            await handleSlackChatMessage(fastify, {
                event,
                botToken: event.slackBotToken,
                botUserId: decision.botUserId,
                inbound: decision.inbound,
            })
        } catch (error) {
            console.error('[slack events] failed', error)
        }
        return reply.status(200).send({ ok: true })
    }
}

export const slackOfficialEventsRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const decision = decideInbound(request)
        if (decision.kind === 'challenge') return reply.status(200).send({ challenge: decision.challenge })
        if (decision.kind === 'ignore') return reply.status(200).send(decision.payload)
        if (decision.kind === 'uninstalled') {
            await SlackInstallationDao.deleteInstallation(fastify.firebase, decision.teamId).catch((error) =>
                console.error('[slack events] uninstall cleanup failed', error)
            )
            return reply.status(200).send({ ok: true })
        }
        if (!decision.teamId) return reply.status(200).send({ ok: true })

        try {
            const installation = await SlackInstallationDao.getInstallation(fastify.firebase, decision.teamId)
            if (!installation) {
                console.warn('[slack events] no installation for team', { teamId: decision.teamId })
                return reply.status(200).send({ ok: true })
            }
            const events = await EventDao.getEventsBySlackTeamId(fastify.firebase, decision.teamId)
            const pick = pickEventForSlackChannel(events, decision.inbound.channel)
            if (pick.kind !== 'event') {
                await postSlackMessage(installation.botToken, {
                    channel: decision.inbound.channel,
                    threadTs: decision.inbound.thread_ts ?? decision.inbound.ts,
                    text: describeSlackPickFailure(pick),
                })
                return reply.status(200).send({ ok: true })
            }
            console.info('[slack events] handling', { eventId: pick.event.id, type: decision.inbound.type })
            await handleSlackChatMessage(fastify, {
                event: pick.event,
                botToken: installation.botToken,
                botUserId: decision.botUserId ?? installation.botUserId,
                inbound: decision.inbound,
            })
        } catch (error) {
            console.error('[slack events] failed', error)
        }
        return reply.status(200).send({ ok: true })
    }
}
