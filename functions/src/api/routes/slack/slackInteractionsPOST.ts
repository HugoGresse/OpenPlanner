import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Event } from '../../../types'
import { AiActionDao } from '../../dao/aiActionDao'
import { EventDao } from '../../dao/eventDao'
import { SlackInstallationDao } from '../../dao/slackInstallationDao'
import { SlackProposalDao, SlackProposalRecord } from '../../dao/slackProposalDao'
import { updateSlackMessage } from './slackApi'
import { SLACK_ACTION_IDS, SlackProposalStatus, buildBatchBlocks, buildProposalBlocks } from './slackFormat'
import { decodeActionValue } from './slackRouting'

type SlackAction = { action_id?: string; value?: string }

type SlackInteractionPayload = {
    type?: string
    user?: { id?: string }
    team?: { id?: string }
    channel?: { id?: string }
    message?: { ts?: string }
    actions?: SlackAction[]
}

const description =
    'Handles the Apply / Reject buttons on chat proposals. Applying a proposal replays the PATCH/DELETE the web UI would have called and records the decision in the AI audit log.'

export const slackInteractionsPOSTSchema = {
    tags: ['slack'],
    summary: 'Slack Interactivity endpoint for a self-managed Slack app',
    description,
    params: { type: 'object', properties: { eventId: { type: 'string' } }, required: ['eventId'] },
}

export const slackOfficialInteractionsPOSTSchema = {
    tags: ['slack'],
    summary: 'Slack Interactivity endpoint for the official OpenPlanner Slack app',
    description,
}

type Decision = { status: SlackProposalStatus; error?: string }

type ActionContext = { event: Event; botToken: string | null; userId: string | undefined }

const resolveBotToken = async (fastify: FastifyInstance, event: Event): Promise<string | null> => {
    if (event.slackTeamId) {
        const installation = await SlackInstallationDao.getInstallation(fastify.firebase, event.slackTeamId)
        return installation?.botToken ?? null
    }
    return event.slackBotToken ?? null
}

const applyProposal = async (
    fastify: FastifyInstance,
    event: Event,
    record: SlackProposalRecord
): Promise<Decision> => {
    if (!event.apiKey) return { status: 'failed', error: 'Event API key is not set. Generate one in the API page.' }
    const { method, path, body } = record.proposal.endpoint
    const response = await fastify.inject({
        method,
        url: `${path}?apiKey=${encodeURIComponent(event.apiKey)}`,
        payload: body,
    })
    if (response.statusCode >= 200 && response.statusCode < 300) return { status: 'applied' }
    return { status: 'failed', error: `API responded ${response.statusCode}: ${response.body.slice(0, 300)}` }
}

const recordAudit = (fastify: FastifyInstance, eventId: string, record: SlackProposalRecord, decision: Decision) =>
    AiActionDao.addAction(fastify.firebase, eventId, {
        tool: record.proposal.kind,
        target: record.proposal.target,
        args: record.proposal.endpoint.body ?? {},
        diff: record.proposal.diff,
        summary: record.proposal.summary,
        prompt: record.prompt,
        model: record.model,
        applied: decision.status === 'applied',
        rejected: decision.status === 'rejected',
    }).catch((error) => console.error('[slack interactions] audit log failed', error))

const decideProposal = async (
    fastify: FastifyInstance,
    { event, botToken, userId }: ActionContext,
    record: SlackProposalRecord,
    apply: boolean
): Promise<Decision> => {
    if (record.status !== 'pending') return { status: record.status, error: record.error }
    const decision: Decision = apply ? await applyProposal(fastify, event, record) : { status: 'rejected' }

    await SlackProposalDao.updateStatus(fastify.firebase, event.id, record.id, decision)
    await recordAudit(fastify, event.id, record, decision)
    if (botToken && record.messageTs) {
        const message = buildProposalBlocks({
            eventId: event.id,
            proposalId: record.id,
            proposal: record.proposal,
            status: decision.status,
            decidedBy: userId,
            error: decision.error,
        })
        await updateSlackMessage(botToken, { channel: record.channel, ts: record.messageTs, ...message }).catch(
            (error) => console.error('[slack interactions] message update failed', error)
        )
    }
    return decision
}

const summarizeBatch = (decisions: Decision[]) => {
    const count = (status: SlackProposalStatus) => decisions.filter((d) => d.status === status).length
    return [
        count('applied') && `${count('applied')} applied`,
        count('rejected') && `${count('rejected')} rejected`,
        count('failed') && `${count('failed')} failed`,
    ]
        .filter(Boolean)
        .join(', ')
}

const handleBatchAction = async (
    fastify: FastifyInstance,
    context: ActionContext,
    batchId: string,
    apply: boolean,
    payload: SlackInteractionPayload
) => {
    const records = await SlackProposalDao.listBatch(fastify.firebase, context.event.id, batchId)
    const decisions: Decision[] = []
    for (const record of records) {
        decisions.push(await decideProposal(fastify, context, record, apply))
    }
    const channel = payload.channel?.id
    const ts = payload.message?.ts
    if (!context.botToken || !channel || !ts) return
    const failed = decisions.some((d) => d.status === 'failed')
    const message = buildBatchBlocks({
        eventId: context.event.id,
        batchId,
        count: records.length,
        status: failed ? 'failed' : apply ? 'applied' : 'rejected',
        decidedBy: context.userId,
        summary: summarizeBatch(decisions),
    })
    await updateSlackMessage(context.botToken, { channel, ts, ...message }).catch((error) =>
        console.error('[slack interactions] batch message update failed', error)
    )
}

export type InteractionsMode = 'event' | 'official'

const resolveActionEvent = async (
    fastify: FastifyInstance,
    mode: InteractionsMode,
    request: FastifyRequest<{ Params: { eventId?: string } }>,
    eventId: string,
    payload: SlackInteractionPayload
): Promise<Event | null> => {
    if (mode === 'event') {
        return request.openPlannerEvent.id === eventId ? request.openPlannerEvent : null
    }
    const event = await EventDao.getEvent(fastify.firebase, eventId).catch(() => null)
    return event && event.slackTeamId && event.slackTeamId === payload.team?.id ? event : null
}

const handleAction = async (
    fastify: FastifyInstance,
    mode: InteractionsMode,
    request: FastifyRequest<{ Params: { eventId?: string } }>,
    action: SlackAction,
    payload: SlackInteractionPayload
) => {
    const decoded = decodeActionValue(action.value)
    if (!decoded) return
    const event = await resolveActionEvent(fastify, mode, request, decoded.eventId, payload)
    if (!event) {
        console.warn('[slack interactions] action for unknown/unlinked event', { eventId: decoded.eventId })
        return
    }
    const context: ActionContext = { event, botToken: await resolveBotToken(fastify, event), userId: payload.user?.id }

    switch (action.action_id) {
        case SLACK_ACTION_IDS.applyProposal:
        case SLACK_ACTION_IDS.rejectProposal: {
            const record = await SlackProposalDao.getProposal(fastify.firebase, event.id, decoded.id)
            if (!record) return
            await decideProposal(fastify, context, record, action.action_id === SLACK_ACTION_IDS.applyProposal)
            return
        }
        case SLACK_ACTION_IDS.applyBatch:
        case SLACK_ACTION_IDS.rejectBatch:
            await handleBatchAction(
                fastify,
                context,
                decoded.id,
                action.action_id === SLACK_ACTION_IDS.applyBatch,
                payload
            )
            return
        default:
            return
    }
}

export const slackInteractionsRouteHandler = (fastify: FastifyInstance, mode: InteractionsMode) => {
    return async (request: FastifyRequest<{ Params: { eventId?: string } }>, reply: FastifyReply) => {
        const payload = (request.body ?? {}) as SlackInteractionPayload
        if (payload.type !== 'block_actions' || !Array.isArray(payload.actions)) {
            return reply.status(200).send()
        }
        try {
            for (const action of payload.actions) {
                await handleAction(fastify, mode, request, action, payload)
            }
        } catch (error) {
            console.error('[slack interactions] failed', error)
        }
        return reply.status(200).send()
    }
}
