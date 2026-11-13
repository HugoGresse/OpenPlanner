// Shared by the web UI, the Slack cards and the server-side proposal tools (functions/ imports this file).
export type ProposalKindMeta = {
    label: string
    entity: string
    emoji: string
    // Side effect beyond the data change, shown next to the Apply button.
    effect?: string
}

export const PROPOSAL_KINDS = {
    patchSpeaker: { label: 'Update speaker', entity: 'Speaker', emoji: '🧑‍🎤' },
    createSpeaker: { label: 'Create speaker', entity: 'Speaker', emoji: '🧑‍🎤' },
    deleteSpeaker: { label: 'Delete speaker', entity: 'Speaker', emoji: '🗑️' },
    patchSession: { label: 'Update session', entity: 'Session', emoji: '🎤' },
    createSession: { label: 'Create session', entity: 'Session', emoji: '🎤' },
    deleteSession: { label: 'Delete session', entity: 'Session', emoji: '🗑️' },
    patchEvent: { label: 'Update event', entity: 'Event', emoji: '📅' },
    deployEvent: {
        label: 'Update website',
        entity: 'Event',
        emoji: '🚀',
        effect: 'Publishes the current data to the public website and calls the event webhooks.',
    },
    approvePendingEdit: {
        label: 'Approve speaker edit',
        entity: 'Speaker edit',
        emoji: '✅',
        effect: 'Applies the change to the speaker profile and emails the speaker.',
    },
    rejectPendingEdit: {
        label: 'Reject speaker edit',
        entity: 'Speaker edit',
        emoji: '✋',
        effect: 'Emails the speaker that the change was rejected.',
    },
    addSponsor: { label: 'Add sponsor', entity: 'Sponsor', emoji: '🤝' },
    deleteSponsor: { label: 'Delete sponsor', entity: 'Sponsor', emoji: '🗑️' },
    deleteSponsorCategory: {
        label: 'Delete sponsor category',
        entity: 'Sponsor category',
        emoji: '🗑️',
        effect: 'Every sponsor in the category is deleted too.',
    },
    setJobPostStatus: { label: 'Moderate job post', entity: 'Job post', emoji: '💼' },
    deleteJobPost: { label: 'Delete job post', entity: 'Job post', emoji: '🗑️' },
    addTeamMember: { label: 'Add team member', entity: 'Team member', emoji: '👥' },
    updateTeamMember: { label: 'Update team member', entity: 'Team member', emoji: '👥' },
    deleteTeamMember: { label: 'Delete team member', entity: 'Team member', emoji: '🗑️' },
    addFaqQuestion: { label: 'Add FAQ question', entity: 'FAQ question', emoji: '❓' },
    deleteFaqQuestion: { label: 'Delete FAQ question', entity: 'FAQ question', emoji: '🗑️' },
    deleteFaqCategory: {
        label: 'Delete FAQ category',
        entity: 'FAQ category',
        emoji: '🗑️',
        effect: 'Every question in the category is deleted too.',
    },
} as const satisfies Record<string, ProposalKindMeta>

export type ProposalKind = keyof typeof PROPOSAL_KINDS

export type ProposalMethod = 'POST' | 'PATCH' | 'PUT' | 'DELETE'

// The wire shape of an assistant proposal: SSE `proposal` event, stored Slack proposal, CLI chat output.
export type Proposal = {
    kind: ProposalKind
    // Built by the server from the resolved target, never sourced from the model.
    summary: string
    // Model-authored explanation (`rationale` argument), shown as "Reason (from assistant)".
    rationale?: string
    // Called (relative to the API base, with the event API key) when the user clicks Apply.
    endpoint: { method: ProposalMethod; path: string; body?: Record<string, unknown> }
    target: { id: string; label?: string }
    // Field-level before/after. For deletes, `before` is the record snapshot and `after` is null.
    diff: { before: Record<string, unknown>; after: Record<string, unknown> | null }
}

// Every DELETE route removes data for good: the UI flags it and asks for an explicit confirmation.
export const isDestructive = (proposal: Pick<Proposal, 'endpoint'>): boolean => proposal.endpoint.method === 'DELETE'

export const IRREVERSIBLE_WARNING = 'Irreversible: applying this deletes data for good.'

// Slack stores proposals, so a record may name a kind this build does not know.
export const proposalKindMeta = (kind: string): ProposalKindMeta =>
    (PROPOSAL_KINDS as Record<string, ProposalKindMeta>)[kind] ?? { label: kind, entity: 'Change', emoji: '✏️' }
