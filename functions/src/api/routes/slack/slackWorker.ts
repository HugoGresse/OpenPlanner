import { FastifyInstance } from 'fastify'
import { onTaskDispatched } from 'firebase-functions/v2/tasks'
import { getFunctions } from 'firebase-admin/functions'
import { EventDao } from '../../dao/eventDao'
import { SlackInstallationDao } from '../../dao/slackInstallationDao'
import { postSlackMessage } from './slackApi'
import { SlackChatContext, SlackInboundEvent, handleSlackChatMessage } from './slackChatHandler'
import { SlackInteractionPayload, runSlackInteraction } from './slackInteractionsPOST'
import { describeSlackPickFailure, pickEventForSlackChannel } from './slackRouting'

export const slackWorkerTaskName = 'locations/europe-west1/functions/slackWorker'

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

const runsInline = () =>
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    process.env.FUNCTIONS_EMULATOR === 'true'

// Slack expects an ack within 3s and the Cloud Functions invocation ends when the
// socket closes, so the real work runs in a Cloud Task. Dev/test have no task
// queue and run the work inline instead.
export const dispatchSlackWork = async (fastify: FastifyInstance, work: SlackWork): Promise<void> => {
    if (runsInline()) {
        await runSlackWork(fastify, work).catch((error) => console.error('[slack worker] failed', error))
        return
    }
    await getFunctions(fastify.firebase).taskQueue<SlackWork>(slackWorkerTaskName).enqueue(work)
}

export const slackWorker = onTaskDispatched<SlackWork>(
    {
        region: 'europe-west1',
        timeoutSeconds: 300,
        memory: '512MiB',
        retryConfig: { maxAttempts: 1 },
        rateLimits: { maxConcurrentDispatches: 10 },
    },
    async (request) => {
        // Imported lazily: the Fastify app registers the Slack routes, which import this module.
        const { fastify } = await import('../../index')
        await fastify.ready()
        // Same instance; the TypeBox type-provider generic is irrelevant for route-less usage.
        await runSlackWork(fastify as unknown as FastifyInstance, request.data)
    }
)
