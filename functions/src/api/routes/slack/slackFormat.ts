import { ChatAgentMessage, MAX_CONTENT_LENGTH, MAX_MESSAGES } from '../chat/chatAgent'
import { Proposal } from '../chat/proposalTools'
import { encodeActionValue } from './slackRouting'

export type SlackThreadMessage = {
    ts: string
    text?: string
    user?: string
    bot_id?: string
    subtype?: string
}

export type SlackProposalStatus = 'pending' | 'applied' | 'rejected' | 'failed'

export const SLACK_ACTION_IDS = {
    applyProposal: 'op_apply_proposal',
    rejectProposal: 'op_reject_proposal',
    applyBatch: 'op_apply_batch',
    rejectBatch: 'op_reject_batch',
} as const

const SECTION_TEXT_LIMIT = 2900
const MESSAGE_TEXT_LIMIT = 39000

const truncate = (text: string, limit: number) => (text.length > limit ? `${text.slice(0, limit - 1)}…` : text)

export const stripMentions = (text: string): string =>
    text
        .replace(/<@[A-Z0-9]+(\|[^>]*)?>/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()

export const markdownToMrkdwn = (markdown: string): string =>
    truncate(
        markdown
            .replace(/^#{1,6}\s+(.+)$/gm, '*$1*')
            .replace(/\*\*(.+?)\*\*/g, '*$1*')
            .replace(/__(.+?)__/g, '_$1_')
            .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<$2|$1>')
            .replace(/^\s*[*+]\s+/gm, '- ')
            .replace(/&/g, '&amp;')
            .replace(/&amp;(amp|lt|gt);/g, '&$1;'),
        MESSAGE_TEXT_LIMIT
    )

const isBotMessage = (message: SlackThreadMessage, botUserId: string | undefined) =>
    Boolean(message.bot_id) || (Boolean(botUserId) && message.user === botUserId)

const mergeConsecutiveRoles = (messages: ChatAgentMessage[]): ChatAgentMessage[] =>
    messages.reduce<ChatAgentMessage[]>((acc, message) => {
        const last = acc[acc.length - 1]
        if (last && last.role === message.role) {
            last.content = `${last.content}\n\n${message.content}`
        } else {
            acc.push({ ...message })
        }
        return acc
    }, [])

export const threadToChatMessages = (
    replies: SlackThreadMessage[],
    botUserId: string | undefined,
    currentText: string
): ChatAgentMessage[] => {
    const fromThread = replies
        .filter((m) => !m.subtype && typeof m.text === 'string')
        .map<ChatAgentMessage>((m) => ({
            role: isBotMessage(m, botUserId) ? 'assistant' : 'user',
            content: stripMentions(m.text ?? ''),
        }))
        .filter((m) => m.content.length > 0)

    const current = stripMentions(currentText)
    const last = fromThread[fromThread.length - 1]
    const messages =
        last?.role === 'user' && last.content === current
            ? fromThread
            : [...fromThread, { role: 'user' as const, content: current }]

    const merged = mergeConsecutiveRoles(messages).map((m) => ({
        ...m,
        content: truncate(m.content, MAX_CONTENT_LENGTH),
    }))
    const firstUserIndex = merged.findIndex((m) => m.role === 'user')
    const startingWithUser = firstUserIndex > 0 ? merged.slice(firstUserIndex) : merged
    return startingWithUser.slice(-MAX_MESSAGES)
}

const formatValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '_(empty)_'
    if (typeof value === 'string') return truncate(value, 300)
    return truncate(JSON.stringify(value), 300)
}

export const formatProposalDiff = (proposal: Proposal): string => {
    if (proposal.diff.after === null) {
        return `Delete *${proposal.target.label ?? proposal.target.id}*`
    }
    return Object.entries(proposal.diff.after)
        .map(([field, after]) => `• *${field}*: ${formatValue(proposal.diff.before[field])} → ${formatValue(after)}`)
        .join('\n')
}

const STATUS_LABELS: Record<SlackProposalStatus, string> = {
    pending: '⏳ Pending review',
    applied: '✅ Applied',
    rejected: '🚫 Rejected',
    failed: '❌ Failed',
}

export type ProposalBlocksArgs = {
    eventId: string
    proposalId: string
    proposal: Proposal
    status: SlackProposalStatus
    decidedBy?: string
    error?: string
}

export const buildProposalBlocks = ({
    eventId,
    proposalId,
    proposal,
    status,
    decidedBy,
    error,
}: ProposalBlocksArgs) => {
    const rationale = proposal.rationale ? `\n_Reason (from assistant): ${proposal.rationale}_` : ''
    const body = truncate(`*${proposal.summary}*${rationale}\n${formatProposalDiff(proposal)}`, SECTION_TEXT_LIMIT)
    const blocks: object[] = [{ type: 'section', text: { type: 'mrkdwn', text: body } }]

    if (status === 'pending') {
        blocks.push({
            type: 'actions',
            block_id: `proposal_${proposalId}`,
            elements: [
                {
                    type: 'button',
                    style: 'primary',
                    text: { type: 'plain_text', text: 'Apply' },
                    action_id: SLACK_ACTION_IDS.applyProposal,
                    value: encodeActionValue(eventId, proposalId),
                },
                {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Reject' },
                    action_id: SLACK_ACTION_IDS.rejectProposal,
                    value: encodeActionValue(eventId, proposalId),
                },
            ],
        })
    } else {
        const who = decidedBy ? ` by <@${decidedBy}>` : ''
        const detail = error ? ` — ${truncate(error, 500)}` : ''
        blocks.push({
            type: 'context',
            elements: [{ type: 'mrkdwn', text: `${STATUS_LABELS[status]}${who}${detail}` }],
        })
    }
    return { text: `${STATUS_LABELS[status]}: ${proposal.summary}`, blocks }
}

export type BatchBlocksArgs = {
    eventId: string
    batchId: string
    count: number
    status: SlackProposalStatus
    decidedBy?: string
    summary?: string
}

export const buildBatchBlocks = ({ eventId, batchId, count, status, decidedBy, summary }: BatchBlocksArgs) => {
    if (status === 'pending') {
        return {
            text: `${count} proposals pending review`,
            blocks: [
                { type: 'section', text: { type: 'mrkdwn', text: `*${count} proposals* queued above.` } },
                {
                    type: 'actions',
                    block_id: `batch_${batchId}`,
                    elements: [
                        {
                            type: 'button',
                            style: 'primary',
                            text: { type: 'plain_text', text: 'Apply all' },
                            action_id: SLACK_ACTION_IDS.applyBatch,
                            value: encodeActionValue(eventId, batchId),
                        },
                        {
                            type: 'button',
                            style: 'danger',
                            text: { type: 'plain_text', text: 'Reject all' },
                            action_id: SLACK_ACTION_IDS.rejectBatch,
                            value: encodeActionValue(eventId, batchId),
                        },
                    ],
                },
            ],
        }
    }
    const who = decidedBy ? ` by <@${decidedBy}>` : ''
    const text = `${STATUS_LABELS[status]}${who}${summary ? ` — ${summary}` : ''}`
    return { text, blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }] }
}
