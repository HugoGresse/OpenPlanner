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

export type ChatStreamEvent =
    | { type: 'eventSummary'; event: EventSummary }
    | { type: 'content'; delta: string }
    | { type: 'toolCall'; id: string; name: string; arguments: Record<string, unknown> }
    | { type: 'toolResult'; id: string; name: string; result: unknown }
    | { type: 'error'; status?: number; error: string }
