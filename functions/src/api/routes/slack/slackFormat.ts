import { ChatAgentMessage, MAX_CONTENT_LENGTH, MAX_MESSAGES } from '../chat/chatAgent'

export type SlackThreadMessage = {
    ts: string
    text?: string
    user?: string
    bot_id?: string
    subtype?: string
    blocks?: Array<{ type?: string }>
}

export type SlackProposalStatus = 'pending' | 'applying' | 'applied' | 'rejected' | 'failed'

export const SLACK_ACTION_IDS = {
    applyProposal: 'op_apply_proposal',
    rejectProposal: 'op_reject_proposal',
    applyBatch: 'op_apply_batch',
    rejectBatch: 'op_reject_batch',
} as const

export const MESSAGE_TEXT_LIMIT = 39000

export const truncate = (text: string, limit: number) => (text.length > limit ? `${text.slice(0, limit - 1)}…` : text)

// Slack mrkdwn treats & < > as control characters (entities, links, mentions).
export const escapeMrkdwn = (text: string): string =>
    text
        .replace(/&(?!(amp|lt|gt);)/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

export const stripMentions = (text: string): string =>
    text
        .replace(/<@[A-Z0-9]+(\|[^>]*)?>/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()

export const markdownToMrkdwn = (markdown: string): string =>
    truncate(
        escapeMrkdwn(markdown)
            .replace(/^#{1,6}\s+(.+)$/gm, '*$1*')
            .replace(/\*\*(.+?)\*\*/g, '*$1*')
            .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<$2|$1>')
            .replace(/^\s*[*+]\s+/gm, '- '),
        MESSAGE_TEXT_LIMIT
    )

const isBotMessage = (message: SlackThreadMessage, botUserId: string | undefined) =>
    Boolean(message.bot_id) || (Boolean(botUserId) && message.user === botUserId)

// Proposal cards and batch banners carry actions/context blocks; plain replies only get rich_text.
const isInteractiveCard = (message: SlackThreadMessage) =>
    Array.isArray(message.blocks) && message.blocks.some((b) => b.type === 'actions' || b.type === 'context')

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
        .filter((m) => !m.subtype && typeof m.text === 'string' && !isInteractiveCard(m))
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
