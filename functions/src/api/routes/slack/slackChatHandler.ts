import { FastifyInstance } from 'fastify'
import { Event } from '../../../types'
import { SlackCredentialSource, SlackProposalDao, SlackProposalRecord } from '../../dao/slackProposalDao'
import { DEFAULT_CHAT_MODEL, runChatAgent } from '../chat/chatAgent'
import { fetchSlackThreadReplies, postSlackMessage, updateSlackMessage, updateSlackMessageWithRetry } from './slackApi'
import { buildBatchBlocks, buildProposalBlocks } from './slackCards'
import { MESSAGE_TEXT_LIMIT, markdownToMrkdwn, stripMentions, threadToChatMessages, truncate } from './slackFormat'

// chat.update is Tier 3 (~50/min per workspace); leave room for concurrent threads.
const STREAM_UPDATE_INTERVAL_MS = 3000
const ERROR_TEXT_LIMIT = 500

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
    credential: SlackCredentialSource
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

// Placeholder ts is unique per turn; tool-call ids from some providers are not.
const proposalDocId = (batchId: string, index: number) => `${batchId.replace('.', '-')}-${index + 1}`

const postProposals = async (
    fastify: FastifyInstance,
    context: SlackChatContext,
    thread: { channel: string; threadTs: string; batchId: string },
    proposals: Array<{ proposal: SlackProposalRecord['proposal'] }>,
    prompt: string,
    model: string
) => {
    const { event, botToken: token, credential } = context
    const records: SlackProposalRecord[] = []
    for (const [index, { proposal }] of proposals.entries()) {
        const id = proposalDocId(thread.batchId, index)
        const message = buildProposalBlocks({ eventId: event.id, proposalId: id, proposal, status: 'pending' })
        const posted = await postSlackMessage(token, { channel: thread.channel, threadTs: thread.threadTs, ...message })
        records.push({
            id,
            batchId: thread.batchId,
            proposal,
            status: 'pending',
            credential,
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

    const [replies, placeholder] = await Promise.all([
        fetchSlackThreadReplies(token, channel, threadTs).catch(() => []),
        postSlackMessage(token, { channel, threadTs, text: '_Thinking…_' }),
    ])
    const messages = threadToChatMessages(replies, botUserId, inbound.text ?? '')
    const model = event.openRouterModel || DEFAULT_CHAT_MODEL

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

    const errorText = errors.length > 0 ? `\n:warning: ${truncate(errors.join('\n'), ERROR_TEXT_LIMIT)}` : ''
    const finalText = truncate(`${markdownToMrkdwn(result.text) || '_(no reply)_'}${errorText}`, MESSAGE_TEXT_LIMIT)
    await updateSlackMessageWithRetry(token, { ...placeholder, text: finalText }).catch((error) =>
        console.error('[slack chat] final message update failed', error)
    )

    if (result.proposals.length > 0) {
        const prompt = stripMentions(inbound.text ?? '')
        await postProposals(
            fastify,
            context,
            { channel, threadTs, batchId: placeholder.ts },
            result.proposals,
            prompt,
            model
        )
    }
}
