import { Proposal } from './proposalKinds'

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

export type { Proposal }

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
