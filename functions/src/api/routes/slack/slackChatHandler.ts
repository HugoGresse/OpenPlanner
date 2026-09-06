import { FastifyInstance } from 'fastify'
import { Event } from '../../../types'
import { SlackProposalDao, SlackProposalRecord } from '../../dao/slackProposalDao'
import { DEFAULT_CHAT_MODEL, runChatAgent } from '../chat/chatAgent'
import { fetchSlackThreadReplies, postSlackMessage, updateSlackMessage } from './slackApi'
import {
    buildBatchBlocks,
    buildProposalBlocks,
    markdownToMrkdwn,
    stripMentions,
    threadToChatMessages,
} from './slackFormat'

const STREAM_UPDATE_INTERVAL_MS = 1500

export type SlackInboundEvent = {
    type: string
    subtype?: string
    channel: string
    channel_type?: string
    user?: string
    bot_id?: string
    text?: string
    ts: string
    thread_ts?: string
}

export type SlackChatContext = {
    event: Event
    botToken: string
    botUserId: string | undefined
    inbound: SlackInboundEvent
}

const createThrottledUpdater = (update: (text: string) => Promise<void>, intervalMs: number) => {
    let latest = ''
    let sent = ''
    let timer: NodeJS.Timeout | null = null
    let inFlight: Promise<void> = Promise.resolve()

    const flush = () => {
        timer = null
        if (latest === sent) return
        sent = latest
        inFlight = inFlight.then(() => update(sent)).catch(() => undefined)
    }
    return {
        push: (text: string) => {
            latest = text
            if (!timer) timer = setTimeout(flush, intervalMs)
        },
        stop: async () => {
            if (timer) clearTimeout(timer)
            timer = null
            await inFlight
        },
    }
}

const postProposals = async (
    fastify: FastifyInstance,
    event: Event,
    token: string,
    thread: { channel: string; threadTs: string; batchId: string },
    proposals: Array<{ id: string; proposal: SlackProposalRecord['proposal'] }>,
    prompt: string,
    model: string
) => {
    const records: SlackProposalRecord[] = []
    for (const { id, proposal } of proposals) {
        const message = buildProposalBlocks({ eventId: event.id, proposalId: id, proposal, status: 'pending' })
        const posted = await postSlackMessage(token, { channel: thread.channel, threadTs: thread.threadTs, ...message })
        records.push({
            id,
            batchId: thread.batchId,
            proposal,
            status: 'pending',
            channel: thread.channel,
            threadTs: thread.threadTs,
            messageTs: posted.ts,
            prompt,
            model,
        })
    }
    if (records.length > 1) {
        const batchMessage = buildBatchBlocks({
            eventId: event.id,
            batchId: thread.batchId,
            count: records.length,
            status: 'pending',
        })
        await postSlackMessage(token, { channel: thread.channel, threadTs: thread.threadTs, ...batchMessage })
    }
    await SlackProposalDao.saveProposals(fastify.firebase, event.id, records)
}

export const handleSlackChatMessage = async (fastify: FastifyInstance, context: SlackChatContext): Promise<void> => {
    const { event, botToken: token, botUserId, inbound } = context
    const channel = inbound.channel
    const threadTs = inbound.thread_ts ?? inbound.ts

    if (!event.openRouterAPIKey) {
        await postSlackMessage(token, {
            channel,
            threadTs,
            text: `OpenRouter API key is not set on the event "${event.name}". Add it under Event Settings → OpenRouter API key.`,
        })
        return
    }

    const replies = await fetchSlackThreadReplies(token, channel, threadTs).catch(() => [])
    const messages = threadToChatMessages(replies, botUserId, inbound.text ?? '')
    const model = event.openRouterModel || DEFAULT_CHAT_MODEL
    const placeholder = await postSlackMessage(token, { channel, threadTs, text: '_Thinking…_' })

    const updater = createThrottledUpdater(
        (text) => updateSlackMessage(token, { ...placeholder, text: `${markdownToMrkdwn(text)} …` }),
        STREAM_UPDATE_INTERVAL_MS
    )
    const errors: string[] = []
    let streamed = ''

    const result = await runChatAgent({
        firebaseApp: fastify.firebase,
        eventId: event.id,
        eventName: event.name,
        openRouterApiKey: event.openRouterAPIKey,
        model,
        messages,
        surface: 'slack',
        onEvent: (agentEvent) => {
            if (agentEvent.type === 'content') {
                streamed += agentEvent.delta
                updater.push(streamed)
            } else if (agentEvent.type === 'error') {
                errors.push(agentEvent.error)
            }
        },
    }).catch((error: unknown) => {
        errors.push(error instanceof Error ? error.message : 'Unknown error')
        return { text: streamed, proposals: [] }
    })
    await updater.stop()

    const errorText = errors.length > 0 ? `\n:warning: ${errors.join('\n')}` : ''
    const finalText = `${markdownToMrkdwn(result.text) || '_(no reply)_'}${errorText}`
    await updateSlackMessage(token, { ...placeholder, text: finalText })

    if (result.proposals.length > 0) {
        const prompt = stripMentions(inbound.text ?? '')
        await postProposals(
            fastify,
            event,
            token,
            { channel, threadTs, batchId: placeholder.ts },
            result.proposals,
            prompt,
            model
        )
    }
}
