import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Event } from '../../../types'
import { AiActionDao } from '../../dao/aiActionDao'
import { EventDao } from '../../dao/eventDao'
import { SlackInstallationDao } from '../../dao/slackInstallationDao'
import { SlackProposalDao, SlackProposalDecision, SlackProposalRecord } from '../../dao/slackProposalDao'
import { updateSlackMessage } from './slackApi'
import { buildBatchBlocks, buildProposalBlocks } from './slackCards'
import { SLACK_ACTION_IDS, SlackProposalStatus } from './slackFormat'
import { decodeActionValue } from './slackRouting'
import { SlackWorkSource, dispatchSlackWork } from './slackWorker'

type SlackAction = { action_id?: string; value?: string }

export type SlackInteractionPayload = {
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

type ActionContext = { event: Event; userId: string | undefined }

const resolveBotToken = async (
    fastify: FastifyInstance,
    event: Event,
    record: SlackProposalRecord
): Promise<string | null> => {
    if (record.credential === 'installation' && event.slackTeamId) {
        const installation = await SlackInstallationDao.getInstallation(fastify.firebase, event.slackTeamId)
        return installation?.botToken ?? null
    }
    return event.slackBotToken ?? null
}

const applyProposal = async (
    fastify: FastifyInstance,
    event: Event,
    record: SlackProposalRecord
): Promise<SlackProposalDecision> => {
    if (!event.apiKey) return { status: 'failed', error: 'Event API key is not set. Generate one in the API page.' }
    const { method, path, body } = record.proposal.endpoint
    const response = await fastify.inject({
        method,
        url: `${path}?apiKey=${encodeURIComponent(event.apiKey)}`,
        payload: method === 'DELETE' ? undefined : body,
    })
    if (response.statusCode >= 200 && response.statusCode < 300) return { status: 'applied' }
    return { status: 'failed', error: `API responded ${response.statusCode}: ${response.body.slice(0, 300)}` }
}

// Same args shape as the web UI (useChatStream.recordAuditLog) so the audit trail is uniform.
const recordAudit = (
    fastify: FastifyInstance,
    eventId: string,
    record: SlackProposalRecord,
    decision: SlackProposalDecision
) =>
    AiActionDao.addAction(fastify.firebase, eventId, {
        tool: record.proposal.kind,
        target: record.proposal.target,
        args: {
            proposalId: record.id,
            target: record.proposal.target,
            method: record.proposal.endpoint.method,
            path: record.proposal.endpoint.path,
            body: record.proposal.endpoint.body ?? null,
        },
        diff: record.proposal.diff,
        summary: record.proposal.summary,
        prompt: record.prompt,
        model: record.model,
        applied: decision.status === 'applied',
        rejected: decision.status === 'rejected',
    }).catch((error) => console.error('[slack interactions] audit log failed', error))

const decideProposal = async (
    fastify: FastifyInstance,
    { event, userId }: ActionContext,
    proposalId: string,
    apply: boolean
): Promise<SlackProposalDecision | null> => {
    const record = await SlackProposalDao.claimProposal(fastify.firebase, event.id, proposalId)
    if (!record) return null
    const decision: SlackProposalDecision = apply
        ? await applyProposal(fastify, event, record).catch((error) => ({
              status: 'failed' as const,
              error: error instanceof Error ? error.message : 'Unknown error',
          }))
        : { status: 'rejected' }

    await SlackProposalDao.updateStatus(fastify.firebase, event.id, record.id, decision)
    await recordAudit(fastify, event.id, record, decision)
    const botToken = await resolveBotToken(fastify, event, record)
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

const summarizeBatch = (decisions: SlackProposalDecision[], skipped: number) => {
    const count = (status: SlackProposalStatus) => decisions.filter((d) => d.status === status).length
    return [
        count('applied') && `${count('applied')} applied`,
        count('rejected') && `${count('rejected')} rejected`,
        count('failed') && `${count('failed')} failed`,
        skipped && `${skipped} already decided`,
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
    const decisions: SlackProposalDecision[] = []
    let skipped = 0
    for (const record of records) {
        const decision = await decideProposal(fastify, context, record.id, apply)
        if (decision) decisions.push(decision)
        else skipped++
    }
    const channel = payload.channel?.id
    const ts = payload.message?.ts
    if (!channel || !ts || records.length === 0) return
    const botToken = await resolveBotToken(fastify, context.event, records[0])
    if (!botToken) return
    const failed = decisions.some((d) => d.status === 'failed')
    const message = buildBatchBlocks({
        eventId: context.event.id,
        batchId,
        count: records.length,
        status: failed ? 'failed' : apply ? 'applied' : 'rejected',
        decidedBy: context.userId,
        summary: summarizeBatch(decisions, skipped),
    })
    await updateSlackMessage(botToken, { channel, ts, ...message }).catch((error) =>
        console.error('[slack interactions] batch message update failed', error)
    )
}

const resolveActionEvent = async (
    fastify: FastifyInstance,
    source: SlackWorkSource,
    eventId: string,
    payload: SlackInteractionPayload
): Promise<Event | null> => {
    if (source.kind === 'event' && source.eventId !== eventId) return null
    const event = await EventDao.getEvent(fastify.firebase, eventId).catch(() => null)
    if (!event) return null
    if (source.kind === 'official' && (event.slackTeamId !== source.teamId || event.slackTeamId !== payload.team?.id)) {
        return null
    }
    return event
}

const handleAction = async (
    fastify: FastifyInstance,
    source: SlackWorkSource,
    action: SlackAction,
    payload: SlackInteractionPayload
) => {
    const decoded = decodeActionValue(action.value)
    if (!decoded) return
    const event = await resolveActionEvent(fastify, source, decoded.eventId, payload)
    if (!event) {
        console.warn('[slack interactions] action for unknown/unlinked event', { eventId: decoded.eventId })
        return
    }
    const context: ActionContext = { event, userId: payload.user?.id }

    switch (action.action_id) {
        case SLACK_ACTION_IDS.applyProposal:
        case SLACK_ACTION_IDS.rejectProposal:
            await decideProposal(fastify, context, decoded.id, action.action_id === SLACK_ACTION_IDS.applyProposal)
            return
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

export const runSlackInteraction = async (
    fastify: FastifyInstance,
    source: SlackWorkSource,
    payload: SlackInteractionPayload
): Promise<void> => {
    for (const action of payload.actions ?? []) {
        await handleAction(fastify, source, action, payload)
    }
}

const isBlockActions = (payload: SlackInteractionPayload) =>
    payload.type === 'block_actions' && Array.isArray(payload.actions)

export const slackInteractionsRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Params: { eventId: string } }>, reply: FastifyReply) => {
        const payload = (request.body ?? {}) as SlackInteractionPayload
        if (!isBlockActions(payload)) return reply.status(200).send()
        await dispatchSlackWork(fastify, {
            type: 'interaction',
            source: { kind: 'event', eventId: request.openPlannerEvent.id },
            payload,
        })
        return reply.status(200).send()
    }
}

export const slackOfficialInteractionsRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const payload = (request.body ?? {}) as SlackInteractionPayload
        const teamId = payload.team?.id
        if (!isBlockActions(payload) || !teamId) return reply.status(200).send()
        await dispatchSlackWork(fastify, { type: 'interaction', source: { kind: 'official', teamId }, payload })
        return reply.status(200).send()
    }
}
