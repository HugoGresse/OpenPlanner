import { describe, expect, test } from 'vitest'
import { Proposal } from '../chat/proposalTools'
import { SLACK_ACTION_IDS } from './slackFormat'
import { buildBatchBlocks, buildProposalBlocks, formatFieldValue } from './slackCards'

type Block = {
    type: string
    block_id?: string
    text?: { text: string }
    fields?: Array<{ text: string }>
    elements?: any[]
}

const proposal: Proposal = {
    kind: 'patchSpeaker',
    summary: 'Update speaker Alice',
    rationale: 'Typo in name',
    endpoint: { method: 'PATCH', path: '/v1/evt/speakers/s1', body: { name: 'Alicia', company: 'ACME <Corp>' } },
    target: { id: 's1', label: 'Alice' },
    diff: { before: { name: 'Alice', company: null }, after: { name: 'Alicia', company: 'ACME <Corp>' } },
}

const blocksOf = (message: { blocks: object[] }) => message.blocks as Block[]

describe('buildProposalBlocks', () => {
    test('renders header, target context, rationale, one Before/After row per field, then buttons', () => {
        const message = buildProposalBlocks({ eventId: 'evt', proposalId: 'p1', proposal, status: 'pending' })
        const blocks = blocksOf(message)
        expect(blocks.map((b) => b.type)).toEqual([
            'header',
            'context',
            'context',
            'section',
            'section',
            'divider',
            'actions',
        ])
        expect(blocks[0].text?.text).toBe('🧑‍🎤 Update speaker Alice')
        expect(blocks[1].elements?.[0].text).toBe('Speaker · Alice · `s1`')
        expect(blocks[2].elements?.[0].text).toContain('Typo in name')
        expect(blocks[3].text?.text).toBe('*name*')
        expect(blocks[3].fields?.map((f) => f.text)).toEqual(['Before\nAlice', 'After\nAlicia'])
        expect(blocks[4].fields?.map((f) => f.text)).toEqual(['Before\n_(empty)_', 'After\nACME &lt;Corp&gt;'])

        const actions = blocks[6].elements ?? []
        expect(actions.map((e) => e.action_id)).toEqual([
            SLACK_ACTION_IDS.applyProposal,
            SLACK_ACTION_IDS.rejectProposal,
        ])
        expect(actions[0]).toMatchObject({ style: 'primary', value: 'evt|p1', text: { text: 'Apply' } })
        expect(actions[0].confirm).toBeUndefined()
        expect(message.text).toBe('⏳ Pending review: Update speaker Alice')
    })

    test('deletes show the record snapshot and a danger button with a confirm dialog', () => {
        const message = buildProposalBlocks({
            eventId: 'evt',
            proposalId: 'p2',
            proposal: {
                ...proposal,
                kind: 'deleteSpeaker',
                summary: 'Delete speaker Alice',
                rationale: undefined,
                endpoint: { method: 'DELETE', path: '/v1/evt/speakers/s1' },
                diff: { before: { name: 'Alice', company: 'ACME' }, after: null },
            },
            status: 'pending',
        })
        const blocks = blocksOf(message)
        expect(blocks[0].text?.text).toBe('🗑️ Delete speaker Alice')
        expect(blocks[2].fields?.map((f) => f.text)).toEqual(['*name*', 'Alice'])
        const apply = blocks.find((b) => b.type === 'actions')?.elements?.[0]
        expect(apply).toMatchObject({ style: 'danger', text: { text: 'Delete' } })
        expect(apply.confirm.confirm.text).toBe('Delete')
        expect(apply.confirm.style).toBe('danger')
    })

    test('caps the number of field rows and keeps the diff on decided cards', () => {
        const after = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`field${i}`, `v${i}`]))
        const message = buildProposalBlocks({
            eventId: 'evt',
            proposalId: 'p3',
            proposal: { ...proposal, rationale: undefined, diff: { before: {}, after } },
            status: 'applied',
            decidedBy: 'U1',
        })
        const blocks = blocksOf(message)
        expect(blocks.filter((b) => b.type === 'section')).toHaveLength(8)
        expect(blocks.some((b) => b.elements?.[0].text === '_+4 more fields_')).toBe(true)
        expect(blocks.some((b) => b.type === 'actions')).toBe(false)
        expect(blocks[blocks.length - 1].elements?.[0].text).toBe('✅ Applied by <@U1>')
        expect(message.text).toBe('✅ Applied: Update speaker Alice')
    })

    test('formatFieldValue escapes, truncates and pretty-prints objects', () => {
        expect(formatFieldValue('')).toBe('_(empty)_')
        expect(formatFieldValue('a & b')).toBe('a &amp; b')
        expect(formatFieldValue({ start: '2026-01-01' })).toBe('{\n "start": "2026-01-01"\n}')
        expect(formatFieldValue('x'.repeat(1000))).toHaveLength(700)
    })
})

describe('buildBatchBlocks', () => {
    test('pending batch has a header and confirmed Apply all', () => {
        const blocks = blocksOf(buildBatchBlocks({ eventId: 'evt', batchId: 'b1', count: 3, status: 'pending' }))
        expect(blocks[0].text?.text).toBe('📦 3 changes to review')
        const [applyAll, rejectAll] = blocks[2].elements ?? []
        expect(applyAll).toMatchObject({ action_id: SLACK_ACTION_IDS.applyBatch, value: 'evt|b1', style: 'primary' })
        expect(applyAll.confirm.title.text).toBe('Apply 3 changes?')
        expect(rejectAll).toMatchObject({ action_id: SLACK_ACTION_IDS.rejectBatch, style: 'danger' })
    })

    test('decided batch collapses to a status line', () => {
        const message = buildBatchBlocks({
            eventId: 'evt',
            batchId: 'b1',
            count: 3,
            status: 'applied',
            decidedBy: 'U1',
            summary: '3 applied',
        })
        expect(message.text).toBe('✅ Applied by <@U1> — 3 applied')
        expect(blocksOf(message)).toHaveLength(1)
    })
})
