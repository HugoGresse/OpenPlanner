import { describe, expect, test } from 'vitest'
import { Proposal } from '../chat/proposalTools'
import {
    SLACK_ACTION_IDS,
    buildProposalBlocks,
    formatProposalDiff,
    markdownToMrkdwn,
    stripMentions,
    threadToChatMessages,
} from './slackFormat'

const bot = 'U0BOT'

describe('stripMentions', () => {
    test('removes bot mentions and collapses whitespace', () => {
        expect(stripMentions('<@U0BOT> fix   the typo <@U0BOT|planner>')).toBe('fix the typo')
    })
})

describe('markdownToMrkdwn', () => {
    test('converts bold, headers, links and bullets', () => {
        expect(markdownToMrkdwn('## Title\n**bold** and [site](https://x.io)\n* item\n+ other')).toBe(
            '*Title*\n*bold* and <https://x.io|site>\n- item\n- other'
        )
    })

    test('escapes ampersands once', () => {
        expect(markdownToMrkdwn('R&D &amp; more')).toBe('R&amp;D &amp; more')
    })
})

describe('threadToChatMessages', () => {
    test('maps bot replies to assistant, strips mentions, keeps current message once', () => {
        const messages = threadToChatMessages(
            [
                { ts: '1', user: 'U1', text: '<@U0BOT> list speakers' },
                { ts: '2', user: bot, text: 'Here are 3 speakers' },
                { ts: '3', user: 'U1', text: '<@U0BOT> rename Alice to Alicia' },
            ],
            bot,
            '<@U0BOT> rename Alice to Alicia'
        )
        expect(messages).toEqual([
            { role: 'user', content: 'list speakers' },
            { role: 'assistant', content: 'Here are 3 speakers' },
            { role: 'user', content: 'rename Alice to Alicia' },
        ])
    })

    test('appends the current message when the thread fetch failed', () => {
        expect(threadToChatMessages([], bot, '<@U0BOT> hello')).toEqual([{ role: 'user', content: 'hello' }])
    })

    test('merges consecutive same-role messages and drops leading assistant text', () => {
        const messages = threadToChatMessages(
            [
                { ts: '1', bot_id: 'B1', text: 'Thinking…' },
                { ts: '2', user: 'U1', text: 'first' },
                { ts: '3', user: 'U2', text: 'second' },
                { ts: '4', user: 'U1', subtype: 'channel_join', text: 'joined' },
            ],
            bot,
            'second'
        )
        expect(messages).toEqual([{ role: 'user', content: 'first\n\nsecond' }])
    })
})

const proposal: Proposal = {
    kind: 'patchSpeaker',
    summary: 'Update speaker Alice',
    rationale: 'Typo in name',
    endpoint: { method: 'PATCH', path: '/v1/evt/speakers/s1', body: { name: 'Alicia' } },
    target: { id: 's1', label: 'Alice' },
    diff: { before: { name: 'Alice' }, after: { name: 'Alicia' } },
}

describe('proposal blocks', () => {
    test('formats a field diff', () => {
        expect(formatProposalDiff(proposal)).toBe('• *name*: Alice → Alicia')
        expect(formatProposalDiff({ ...proposal, diff: { before: { name: 'Alice' }, after: null } })).toBe(
            'Delete *Alice*'
        )
    })

    test('pending proposals carry Apply / Reject buttons, decided ones carry a status line', () => {
        const pending = buildProposalBlocks({ eventId: 'evt', proposalId: 'p1', proposal, status: 'pending' })
        const actions = pending.blocks[1] as { type: string; elements: Array<{ action_id: string; value: string }> }
        expect(actions.type).toBe('actions')
        expect(actions.elements.map((e) => e.action_id)).toEqual([
            SLACK_ACTION_IDS.applyProposal,
            SLACK_ACTION_IDS.rejectProposal,
        ])
        expect(actions.elements[0].value).toBe('evt|p1')

        const applied = buildProposalBlocks({
            eventId: 'evt',
            proposalId: 'p1',
            proposal,
            status: 'applied',
            decidedBy: 'U1',
        })
        expect(applied.blocks).toHaveLength(2)
        expect(JSON.stringify(applied.blocks[1])).toContain('✅ Applied by <@U1>')
        expect(applied.text).toBe('✅ Applied: Update speaker Alice')
    })
})
