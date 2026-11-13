// Shared by the web UI, the Slack cards and the server-side proposal tools (functions/ imports this file).
export type ProposalKindMeta = {
    label: string
    entity: string
    emoji: string
    // Irreversible: the UI asks for an explicit confirmation and renders the action in red.
    destructive: boolean
    // Side effect beyond the data change, shown next to the Apply button.
    effect?: string
}

export const PROPOSAL_KINDS = {
    patchSpeaker: { label: 'Update speaker', entity: 'Speaker', emoji: '🧑‍🎤', destructive: false },
    createSpeaker: { label: 'Create speaker', entity: 'Speaker', emoji: '🧑‍🎤', destructive: false },
    deleteSpeaker: { label: 'Delete speaker', entity: 'Speaker', emoji: '🗑️', destructive: true },
    patchSession: { label: 'Update session', entity: 'Session', emoji: '🎤', destructive: false },
    createSession: { label: 'Create session', entity: 'Session', emoji: '🎤', destructive: false },
    deleteSession: { label: 'Delete session', entity: 'Session', emoji: '🗑️', destructive: true },
    patchEvent: { label: 'Update event', entity: 'Event', emoji: '📅', destructive: false },
    deployEvent: {
        label: 'Update website',
        entity: 'Event',
        emoji: '🚀',
        destructive: false,
        effect: 'Publishes the current data to the public website and calls the event webhooks.',
    },
    approvePendingEdit: {
        label: 'Approve speaker edit',
        entity: 'Speaker edit',
        emoji: '✅',
        destructive: false,
        effect: 'Applies the change to the speaker profile and emails the speaker.',
    },
    rejectPendingEdit: {
        label: 'Reject speaker edit',
        entity: 'Speaker edit',
        emoji: '✋',
        destructive: false,
        effect: 'Emails the speaker that the change was rejected.',
    },
    addSponsor: { label: 'Add sponsor', entity: 'Sponsor', emoji: '🤝', destructive: false },
    deleteSponsor: { label: 'Delete sponsor', entity: 'Sponsor', emoji: '🗑️', destructive: true },
    deleteSponsorCategory: {
        label: 'Delete sponsor category',
        entity: 'Sponsor category',
        emoji: '🗑️',
        destructive: true,
        effect: 'Every sponsor in the category is deleted too.',
    },
    setJobPostStatus: { label: 'Moderate job post', entity: 'Job post', emoji: '💼', destructive: false },
    deleteJobPost: { label: 'Delete job post', entity: 'Job post', emoji: '🗑️', destructive: true },
    addTeamMember: { label: 'Add team member', entity: 'Team member', emoji: '👥', destructive: false },
    updateTeamMember: { label: 'Update team member', entity: 'Team member', emoji: '👥', destructive: false },
    deleteTeamMember: { label: 'Delete team member', entity: 'Team member', emoji: '🗑️', destructive: true },
    addFaqQuestion: { label: 'Add FAQ question', entity: 'FAQ question', emoji: '❓', destructive: false },
    deleteFaqQuestion: { label: 'Delete FAQ question', entity: 'FAQ question', emoji: '🗑️', destructive: true },
    deleteFaqCategory: {
        label: 'Delete FAQ category',
        entity: 'FAQ category',
        emoji: '🗑️',
        destructive: true,
        effect: 'Every question in the category is deleted too.',
    },
} as const satisfies Record<string, ProposalKindMeta>

export type ProposalKind = keyof typeof PROPOSAL_KINDS

export const PROPOSAL_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'] as const
export type ProposalMethod = (typeof PROPOSAL_METHODS)[number]

// Records written before a kind existed (Slack proposals are stored) must still render.
export const proposalKindMeta = (kind: string): ProposalKindMeta =>
    (PROPOSAL_KINDS as Record<string, ProposalKindMeta>)[kind] ?? {
        label: kind,
        entity: 'Change',
        emoji: '✏️',
        destructive: kind.startsWith('delete'),
    }
