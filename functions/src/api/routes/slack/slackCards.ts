import { Proposal, ProposalKind } from '../chat/proposalTools'
import { SLACK_ACTION_IDS, SlackProposalStatus, escapeMrkdwn, truncate } from './slackFormat'
import { encodeActionValue } from './slackRouting'

// Block Kit limits: header 150 chars, section field 2000 chars, 10 fields per section, 50 blocks per message.
const HEADER_LIMIT = 150
const FIELD_VALUE_LIMIT = 700
const MAX_FIELD_ROWS = 8

type KindMeta = { emoji: string; entity: string; destructive: boolean }

const KIND_META: Record<ProposalKind, KindMeta> = {
    patchSpeaker: { emoji: '🧑‍🎤', entity: 'Speaker', destructive: false },
    patchSession: { emoji: '🎤', entity: 'Session', destructive: false },
    patchEvent: { emoji: '📅', entity: 'Event', destructive: false },
    deleteSpeaker: { emoji: '🗑️', entity: 'Speaker', destructive: true },
}

const STATUS_LABELS: Record<SlackProposalStatus, string> = {
    pending: '⏳ Pending review',
    applying: '⏳ Applying…',
    applied: '✅ Applied',
    rejected: '🚫 Rejected',
    failed: '❌ Failed',
}

const plainText = (text: string, limit = HEADER_LIMIT) => ({
    type: 'plain_text',
    text: truncate(text, limit),
    emoji: true,
})
const mrkdwn = (text: string) => ({ type: 'mrkdwn', text })
const context = (...texts: string[]) => ({ type: 'context', elements: texts.map(mrkdwn) })

export const formatFieldValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '_(empty)_'
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 1)
    return escapeMrkdwn(truncate(text, FIELD_VALUE_LIMIT))
}

const changeRow = (field: string, before: unknown, after: unknown) => ({
    type: 'section',
    text: mrkdwn(`*${escapeMrkdwn(field)}*`),
    fields: [mrkdwn(`Before\n${formatFieldValue(before)}`), mrkdwn(`After\n${formatFieldValue(after)}`)],
})

const snapshotRow = (field: string, value: unknown) => ({
    type: 'section',
    fields: [mrkdwn(`*${escapeMrkdwn(field)}*`), mrkdwn(formatFieldValue(value))],
})

const diffBlocks = (proposal: Proposal): object[] => {
    const entries =
        proposal.diff.after === null
            ? Object.entries(proposal.diff.before).map(([field, value]) => snapshotRow(field, value))
            : Object.entries(proposal.diff.after).map(([field, after]) =>
                  changeRow(field, proposal.diff.before[field], after)
              )
    const rows = entries.slice(0, MAX_FIELD_ROWS)
    const hidden = entries.length - rows.length
    return hidden > 0 ? [...rows, context(`_+${hidden} more field${hidden > 1 ? 's' : ''}_`)] : rows
}

type ButtonArgs = {
    label: string
    actionId: string
    value: string
    style?: 'primary' | 'danger'
    confirm?: { title: string; text: string; confirm: string }
}

const button = ({ label, actionId, value, style, confirm }: ButtonArgs) => ({
    type: 'button',
    text: plainText(label, 75),
    action_id: actionId,
    value,
    ...(style ? { style } : {}),
    ...(confirm
        ? {
              confirm: {
                  title: plainText(confirm.title, 100),
                  text: mrkdwn(confirm.text),
                  confirm: plainText(confirm.confirm, 30),
                  deny: plainText('Cancel', 30),
                  style: 'danger',
              },
          }
        : {}),
})

const statusLine = (status: SlackProposalStatus, decidedBy?: string, error?: string) => {
    const who = decidedBy ? ` by <@${decidedBy}>` : ''
    const detail = error ? ` — ${escapeMrkdwn(truncate(error, 500))}` : ''
    return `${STATUS_LABELS[status]}${who}${detail}`
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
    const meta = KIND_META[proposal.kind]
    const target = [meta.entity, proposal.target.label, `\`${proposal.target.id}\``]
        .filter((part): part is string => Boolean(part))
        .map((part, index) => (index === 1 ? escapeMrkdwn(part) : part))
        .join(' · ')
    const blocks: object[] = [{ type: 'header', text: plainText(`${meta.emoji} ${proposal.summary}`) }, context(target)]
    if (proposal.rationale) blocks.push(context(`💬 _${escapeMrkdwn(truncate(proposal.rationale, 500))}_`))
    blocks.push(...diffBlocks(proposal), { type: 'divider' })

    if (status === 'pending') {
        const value = encodeActionValue(eventId, proposalId)
        const apply = meta.destructive
            ? button({
                  label: 'Delete',
                  actionId: SLACK_ACTION_IDS.applyProposal,
                  value,
                  style: 'danger',
                  confirm: {
                      title: 'Delete for real?',
                      text: `*${escapeMrkdwn(proposal.summary)}* cannot be undone.`,
                      confirm: 'Delete',
                  },
              })
            : button({ label: 'Apply', actionId: SLACK_ACTION_IDS.applyProposal, value, style: 'primary' })
        blocks.push({
            type: 'actions',
            block_id: `proposal_${proposalId}`,
            elements: [apply, button({ label: 'Reject', actionId: SLACK_ACTION_IDS.rejectProposal, value })],
        })
    } else {
        blocks.push(context(statusLine(status, decidedBy, error)))
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
        const value = encodeActionValue(eventId, batchId)
        return {
            text: `${count} proposals pending review`,
            blocks: [
                { type: 'header', text: plainText(`📦 ${count} changes to review`) },
                context('Decide each card above, or the whole batch here.'),
                {
                    type: 'actions',
                    block_id: `batch_${batchId}`,
                    elements: [
                        button({
                            label: 'Apply all',
                            actionId: SLACK_ACTION_IDS.applyBatch,
                            value,
                            style: 'primary',
                            confirm: {
                                title: `Apply ${count} changes?`,
                                text: 'Every pending card in this batch will be applied to the event.',
                                confirm: 'Apply all',
                            },
                        }),
                        button({ label: 'Reject all', actionId: SLACK_ACTION_IDS.rejectBatch, value, style: 'danger' }),
                    ],
                },
            ],
        }
    }
    const text = `${statusLine(status, decidedBy)}${summary ? ` — ${summary}` : ''}`
    return { text, blocks: [{ type: 'section', text: mrkdwn(text) }] }
}
