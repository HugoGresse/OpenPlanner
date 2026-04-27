import firebase from 'firebase-admin'
import { EventDao } from '../../dao/eventDao'
import { SessionDao } from '../../dao/sessionDao'
import { SpeakerDao } from '../../dao/speakerDao'
import { READ_ONLY_TOOLS, executeTool } from './tools'

export const MAX_MESSAGES = 50
export const MAX_CONTENT_LENGTH = 50000
export const MAX_TOOL_ROUNDS = 8
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export type EngineRole = 'user' | 'assistant' | 'system'
export type EngineMessage = { role: EngineRole; content: string }

type OpenRouterMessage = {
    role: string
    content: string | null
    tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
    }>
    tool_call_id?: string
    name?: string
}

const buildSystemPrompt = (eventId: string, eventName: string) =>
    `You are an OpenPlanner assistant helping the user explore the event "${eventName}" (id: ${eventId}).\n\nYou can READ event data via tools but you CANNOT mutate anything in this version of the assistant. Do not pretend to perform writes; if the user asks to edit something, explain that write support is coming in a later version.\n\nAlways call list/find tools (listSessions, listSpeakers, listSponsors, getFaq) before referring to specific IDs — never invent IDs. Keep responses concise.`

const consumeOpenRouterStream = async (
    response: Response,
    onDelta: (delta: any) => void
): Promise<{ message: OpenRouterMessage; finishReason: string | null }> => {
    if (!response.body) throw new Error('OpenRouter response has no body')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let assembledContent = ''
    const assembledToolCalls = new Map<
        number,
        { id: string; type: 'function'; function: { name: string; arguments: string } }
    >()
    let finishReason: string | null = null

    while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const payload = trimmed.slice(5).trim()
            if (!payload) continue
            if (payload === '[DONE]') {
                finishReason = finishReason ?? 'stop'
                continue
            }
            try {
                const parsed = JSON.parse(payload)
                const choice = parsed.choices?.[0]
                if (!choice) continue
                const delta = choice.delta ?? {}
                if (typeof delta.content === 'string' && delta.content.length > 0) {
                    assembledContent += delta.content
                    onDelta({ type: 'content', delta: delta.content })
                }
                if (Array.isArray(delta.tool_calls)) {
                    for (const tc of delta.tool_calls) {
                        const idx = typeof tc.index === 'number' ? tc.index : 0
                        const existing = assembledToolCalls.get(idx) ?? {
                            id: '',
                            type: 'function' as const,
                            function: { name: '', arguments: '' },
                        }
                        if (tc.id) existing.id = tc.id
                        if (tc.function?.name) existing.function.name += tc.function.name
                        if (tc.function?.arguments) existing.function.arguments += tc.function.arguments
                        assembledToolCalls.set(idx, existing)
                    }
                }
                if (choice.finish_reason) finishReason = choice.finish_reason
            } catch {
                /* skip malformed */
            }
        }
    }

    const toolCalls = Array.from(assembledToolCalls.values())
    const message: OpenRouterMessage = {
        role: 'assistant',
        content: assembledContent.length > 0 ? assembledContent : null,
    }
    if (toolCalls.length > 0) message.tool_calls = toolCalls
    return { message, finishReason }
}

export type RunChatStreamArgs = {
    firebaseApp: firebase.app.App
    eventId: string
    messages: EngineMessage[]
    model?: string
    /**
     * Called once per emitted SSE event (already JSON-serialized object). The caller is
     * responsible for actually writing it onto the wire (with whatever framing they want).
     */
    onEvent: (data: unknown) => void
}

/**
 * Drives the read-only chat: emits eventSummary, drives OpenRouter through up to
 * MAX_TOOL_ROUNDS tool-call rounds, executes whitelisted DAO-backed tools, and
 * emits content / toolCall / toolResult / error events through the onEvent callback.
 *
 * Throws only on programmer errors (e.g. event not found). Network errors against
 * OpenRouter or tool execution errors are surfaced as `error` / per-tool `error`
 * events instead.
 */
export const runChatStream = async ({
    firebaseApp,
    eventId,
    messages,
    model,
    onEvent,
}: RunChatStreamArgs): Promise<void> => {
    const event = await EventDao.getEvent(firebaseApp, eventId)
    const openRouterApiKey = (event as any).openRouterAPIKey
    if (!openRouterApiKey) {
        throw new Error(
            'OpenRouter API key is not set on this event. Add it under Event Settings → Other stuffs → OpenRouter API key.'
        )
    }
    const chosenModel = model || (event as any).openRouterModel || 'anthropic/claude-sonnet-4'

    const [sessions, speakers] = await Promise.all([
        SessionDao.getSessions(firebaseApp, eventId).catch(() => [] as unknown[]),
        SpeakerDao.getSpeakers(firebaseApp, eventId).catch(() => [] as unknown[]),
    ])

    onEvent({
        type: 'eventSummary',
        event: {
            id: event.id,
            name: event.name,
            dates: event.dates,
            sessionsCount: sessions.length,
            speakersCount: speakers.length,
        },
    })

    const conversation: OpenRouterMessage[] = [
        { role: 'system', content: buildSystemPrompt(eventId, event.name) },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const orResponse = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${openRouterApiKey}`,
                'HTTP-Referer': 'https://openplanner.fr',
                'X-Title': 'OpenPlanner',
            },
            body: JSON.stringify({
                model: chosenModel,
                stream: true,
                messages: conversation,
                tools: READ_ONLY_TOOLS,
            }),
        })

        if (!orResponse.ok) {
            const text = await orResponse.text().catch(() => '')
            onEvent({ type: 'error', status: orResponse.status, error: text || orResponse.statusText })
            return
        }

        const { message, finishReason } = await consumeOpenRouterStream(orResponse, onEvent)
        conversation.push(message)

        if (finishReason !== 'tool_calls' || !message.tool_calls?.length) return

        for (const tc of message.tool_calls) {
            let parsedArgs: Record<string, any> = {}
            try {
                parsedArgs = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}
            } catch {
                parsedArgs = {}
            }
            onEvent({ type: 'toolCall', id: tc.id, name: tc.function.name, arguments: parsedArgs })

            let toolResult: unknown
            try {
                toolResult = await executeTool(firebaseApp, eventId, tc.function.name, parsedArgs)
            } catch (error) {
                toolResult = { error: error instanceof Error ? error.message : 'Unknown error' }
            }

            onEvent({ type: 'toolResult', id: tc.id, name: tc.function.name, result: toolResult })

            conversation.push({
                role: 'tool',
                tool_call_id: tc.id,
                name: tc.function.name,
                content: JSON.stringify(toolResult),
            })
        }
    }
}
