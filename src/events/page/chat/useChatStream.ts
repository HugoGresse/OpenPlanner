import { useCallback, useEffect, useRef, useState } from 'react'
import { API_URL, FUNCTION_API_URL } from '../../../env'
import {
    ChatMessage,
    ChatStreamEvent,
    EventSummary,
    Proposal,
    ProposalEntry,
    ProposalStatus,
    ToolInvocation,
    UsageEvent,
} from './types'

export type ChatTurn = ChatMessage & {
    tools?: ToolInvocation[]
    proposalIds?: string[]
}

export type UseChatStreamState = {
    turns: ChatTurn[]
    streaming: boolean
    error: string | null
    eventSummary: EventSummary | null
    proposals: Record<string, ProposalEntry>
    usage: UsageEvent | null
}

const buildChatUrl = (eventId: string, eventApiKey: string) => {
    // Always go through the direct Cloud Functions URL (FUNCTION_API_URL) for
    // chat. Firebase Hosting buffers streamed SSE responses, which makes the
    // browser receive every event at once when this same path is fronted by
    // Hosting. Hitting the function host directly preserves streaming.
    const apiUrl = new URL(FUNCTION_API_URL as string)
    const basePath = apiUrl.pathname.replace(/\/$/, '')
    apiUrl.pathname = `${basePath}/v1/${eventId}/chat`
    apiUrl.searchParams.set('apiKey', eventApiKey)
    return apiUrl.href
}

const buildHostedUrl = (path: string, eventApiKey: string) => {
    // Non-streaming endpoints (PATCH/DELETE/POST audit log) go through the
    // Hosting-backed API URL so they share the same auth/CORS path as the
    // rest of the admin app.
    const apiUrl = new URL(API_URL as string)
    const basePath = apiUrl.pathname.replace(/\/$/, '')
    apiUrl.pathname = `${basePath}${path}`
    apiUrl.searchParams.set('apiKey', eventApiKey)
    return apiUrl.href
}

const parseSseChunk = (chunk: string): ChatStreamEvent[] => {
    const events: ChatStreamEvent[] = []
    for (const block of chunk.split('\n\n')) {
        const trimmed = block.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
            events.push(JSON.parse(payload) as ChatStreamEvent)
        } catch {
            // skip malformed
        }
    }
    return events
}

export const useChatStream = (eventId: string, eventApiKey: string | null) => {
    const [state, setState] = useState<UseChatStreamState>({
        turns: [],
        streaming: false,
        error: null,
        eventSummary: null,
        proposals: {},
        usage: null,
    })
    const lastUserPromptRef = useRef<string>('')
    const lastModelRef = useRef<string | undefined>(undefined)
    const abortRef = useRef<AbortController | null>(null)
    const mountedRef = useRef(true)

    useEffect(() => {
        return () => {
            mountedRef.current = false
            abortRef.current?.abort()
            abortRef.current = null
        }
    }, [])

    const cancel = useCallback(() => {
        abortRef.current?.abort()
        abortRef.current = null
        setState((s) => ({ ...s, streaming: false }))
    }, [])

    const reset = useCallback(() => {
        abortRef.current?.abort()
        abortRef.current = null
        setState({
            turns: [],
            streaming: false,
            error: null,
            eventSummary: null,
            proposals: {},
            usage: null,
        })
    }, [])

    const setProposalStatus = useCallback((id: string, patch: Partial<ProposalEntry>) => {
        setState((s) => {
            const existing = s.proposals[id]
            if (!existing) return s
            return { ...s, proposals: { ...s.proposals, [id]: { ...existing, ...patch } } }
        })
    }, [])

    const recordAuditLog = useCallback(
        async (proposal: Proposal, applied: boolean, rejected: boolean) => {
            if (!eventApiKey) return
            try {
                await fetch(buildHostedUrl(`/v1/${eventId}/ai-actions`, eventApiKey), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tool: proposal.kind,
                        target: proposal.target,
                        args: proposal.endpoint.body || {},
                        diff: proposal.diff,
                        summary: proposal.summary,
                        prompt: lastUserPromptRef.current,
                        model: lastModelRef.current,
                        applied,
                        rejected,
                    }),
                })
            } catch (error) {
                // Audit log is best-effort; surface in console only.
                console.warn('Failed to record AI action audit log:', error)
            }
        },
        [eventId, eventApiKey]
    )

    const applyProposal = useCallback(
        async (id: string) => {
            if (!eventApiKey) return
            const entry = state.proposals[id]
            if (!entry || entry.status !== 'pending') return
            setProposalStatus(id, { status: 'applying', error: undefined })
            try {
                const url = buildHostedUrl(entry.proposal.endpoint.path, eventApiKey)
                const init: RequestInit = {
                    method: entry.proposal.endpoint.method,
                    headers: { 'Content-Type': 'application/json' },
                }
                if (entry.proposal.endpoint.body && entry.proposal.endpoint.method !== 'DELETE') {
                    init.body = JSON.stringify(entry.proposal.endpoint.body)
                }
                const response = await fetch(url, init)
                if (!response.ok) {
                    const text = await response.text().catch(() => '')
                    setProposalStatus(id, {
                        status: 'failed',
                        error: `${response.status}: ${text || response.statusText}`,
                    })
                    return
                }
                setProposalStatus(id, { status: 'applied' })
                recordAuditLog(entry.proposal, true, false)
            } catch (error) {
                setProposalStatus(id, {
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                })
            }
        },
        [eventApiKey, state.proposals, setProposalStatus, recordAuditLog]
    )

    const rejectProposal = useCallback(
        (id: string) => {
            const entry = state.proposals[id]
            if (!entry || entry.status !== 'pending') return
            setProposalStatus(id, { status: 'rejected' })
            recordAuditLog(entry.proposal, false, true)
        },
        [state.proposals, setProposalStatus, recordAuditLog]
    )

    const send = useCallback(
        async (userMessage: string) => {
            if (!eventApiKey) {
                setState((s) => ({ ...s, error: 'Event has no API key configured.' }))
                return
            }
            if (!userMessage.trim()) return

            lastUserPromptRef.current = userMessage

            const baseTurns: ChatTurn[] = [...state.turns, { role: 'user', content: userMessage }]
            setState((s) => ({
                ...s,
                turns: [...baseTurns, { role: 'assistant', content: '', tools: [], proposalIds: [] }],
                streaming: true,
                error: null,
            }))

            const controller = new AbortController()
            abortRef.current = controller

            try {
                const response = await fetch(buildChatUrl(eventId, eventApiKey), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'text/event-stream',
                    },
                    body: JSON.stringify({
                        messages: baseTurns.map(({ role, content }) => ({ role, content })),
                    }),
                    signal: controller.signal,
                })

                if (!response.ok) {
                    const text = await response.text().catch(() => '')
                    setState((s) => ({
                        ...s,
                        streaming: false,
                        error: `Chat request failed (${response.status}): ${text || response.statusText}`,
                    }))
                    return
                }

                if (!response.body) {
                    setState((s) => ({ ...s, streaming: false, error: 'Empty response body' }))
                    return
                }

                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let buffer = ''

                while (true) {
                    const { value, done } = await reader.read()
                    if (done) break
                    buffer += decoder.decode(value, { stream: true })
                    const splitIdx = buffer.lastIndexOf('\n\n')
                    if (splitIdx === -1) continue
                    const ready = buffer.slice(0, splitIdx + 2)
                    buffer = buffer.slice(splitIdx + 2)

                    for (const evt of parseSseChunk(ready)) {
                        setState((s) => applyEvent(s, evt))
                    }
                }

                if (buffer.trim().length > 0) {
                    for (const evt of parseSseChunk(buffer)) {
                        setState((s) => applyEvent(s, evt))
                    }
                }
            } catch (error: unknown) {
                if ((error as Error)?.name === 'AbortError') {
                    setState((s) => ({ ...s, streaming: false }))
                    return
                }
                setState((s) => ({
                    ...s,
                    streaming: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                }))
            } finally {
                abortRef.current = null
                setState((s) => ({ ...s, streaming: false }))
            }
        },
        [eventId, eventApiKey, state.turns]
    )

    return { state, send, cancel, reset, applyProposal, rejectProposal }
}

const applyEvent = (s: UseChatStreamState, evt: ChatStreamEvent): UseChatStreamState => {
    switch (evt.type) {
        case 'eventSummary':
            return { ...s, eventSummary: evt.event }
        case 'content': {
            const turns = [...s.turns]
            const last = turns[turns.length - 1]
            if (last && last.role === 'assistant') {
                turns[turns.length - 1] = { ...last, content: last.content + evt.delta }
            }
            return { ...s, turns }
        }
        case 'toolCall': {
            const turns = [...s.turns]
            const last = turns[turns.length - 1]
            if (last && last.role === 'assistant') {
                const tools = [...(last.tools ?? []), { id: evt.id, name: evt.name, args: evt.arguments }]
                turns[turns.length - 1] = { ...last, tools }
            }
            return { ...s, turns }
        }
        case 'toolResult': {
            const turns = [...s.turns]
            const last = turns[turns.length - 1]
            if (last && last.role === 'assistant' && last.tools) {
                const tools = last.tools.map((t) => (t.id === evt.id ? { ...t, result: evt.result } : t))
                turns[turns.length - 1] = { ...last, tools }
            }
            return { ...s, turns }
        }
        case 'proposal': {
            const status: ProposalStatus = 'pending'
            const proposals = { ...s.proposals, [evt.id]: { id: evt.id, proposal: evt.proposal, status } }
            const turns = [...s.turns]
            const last = turns[turns.length - 1]
            if (last && last.role === 'assistant') {
                const proposalIds = [...(last.proposalIds ?? []), evt.id]
                turns[turns.length - 1] = { ...last, proposalIds }
            }
            return { ...s, turns, proposals }
        }
        case 'usage':
            return { ...s, usage: evt.usage }
        case 'error':
            return { ...s, error: evt.error, streaming: false }
        default:
            return s
    }
}
