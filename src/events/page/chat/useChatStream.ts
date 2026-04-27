import { useCallback, useRef, useState } from 'react'
import { API_URL } from '../../../env'
import { ChatMessage, ChatStreamEvent, EventSummary, ToolInvocation } from './types'

export type ChatTurn = ChatMessage & {
    tools?: ToolInvocation[]
}

export type UseChatStreamState = {
    turns: ChatTurn[]
    streaming: boolean
    error: string | null
    eventSummary: EventSummary | null
}

const buildChatUrl = (eventId: string, eventApiKey: string) => {
    const apiUrl = new URL(API_URL as string)
    const basePath = apiUrl.pathname.replace(/\/$/, '')
    apiUrl.pathname = `${basePath}/v1/${eventId}/chat`
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
    })
    const abortRef = useRef<AbortController | null>(null)

    const cancel = useCallback(() => {
        abortRef.current?.abort()
        abortRef.current = null
        setState((s) => ({ ...s, streaming: false }))
    }, [])

    const reset = useCallback(() => {
        abortRef.current?.abort()
        abortRef.current = null
        setState({ turns: [], streaming: false, error: null, eventSummary: null })
    }, [])

    const send = useCallback(
        async (userMessage: string) => {
            if (!eventApiKey) {
                setState((s) => ({ ...s, error: 'Event has no API key configured.' }))
                return
            }
            if (!userMessage.trim()) return

            const baseTurns: ChatTurn[] = [...state.turns, { role: 'user', content: userMessage }]
            setState((s) => ({
                ...s,
                turns: [...baseTurns, { role: 'assistant', content: '', tools: [] }],
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

    return { state, send, cancel, reset }
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
        case 'error':
            return { ...s, error: evt.error, streaming: false }
        default:
            return s
    }
}
