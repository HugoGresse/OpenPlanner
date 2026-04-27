export type ChatRole = 'user' | 'assistant' | 'system'

export type ChatMessage = {
    role: ChatRole
    content: string
}

export type ToolInvocation = {
    id: string
    name: string
    args: Record<string, unknown>
    result?: unknown
}

export type EventSummary = {
    id: string
    name: string
    dates?: { start: string | null; end: string | null } | null
    sessionsCount: number
    speakersCount: number
}

export type ProposalKind = 'patchSpeaker' | 'patchSession' | 'patchEvent' | 'deleteSpeaker'

export type Proposal = {
    kind: ProposalKind
    /** Auto-generated label (server-built from the resolved target). Always present. */
    summary: string
    /** Optional model-authored explanation (rationale arg on the propose* tool). */
    rationale?: string
    endpoint: { method: 'PATCH' | 'DELETE'; path: string; body?: Record<string, unknown> }
    target: { id: string; label?: string }
    diff: { before: Record<string, unknown>; after: Record<string, unknown> | null }
}

export type ProposalStatus = 'pending' | 'applying' | 'applied' | 'rejected' | 'failed'

export type ProposalEntry = {
    id: string
    proposal: Proposal
    status: ProposalStatus
    error?: string
    /** Captured at proposal-emit time so the audit log records the *exact* prompt + model in flight when the proposal was made, even if the user approves it after subsequent chat turns. */
    prompt?: string
    model?: string
}

export type ChatStreamEvent =
    | { type: 'eventSummary'; event: EventSummary; model?: string }
    | { type: 'content'; delta: string }
    | { type: 'toolCall'; id: string; name: string; arguments: Record<string, unknown> }
    | { type: 'toolResult'; id: string; name: string; result: unknown }
    | { type: 'proposal'; id: string; proposal: Proposal }
    | { type: 'error'; status?: number; error: string }
