import firebase from 'firebase-admin'
import { READ_ONLY_TOOLS, executeTool } from './tools'
import { PROPOSAL_TOOLS, Proposal, buildProposal, isProposalTool } from './proposalTools'

export const MAX_MESSAGES = 50
export const MAX_CONTENT_LENGTH = 50000
export const MAX_TOOL_ROUNDS = 8
export const MAX_PROPOSALS_PER_REQUEST = 25
export const DEFAULT_CHAT_MODEL = 'anthropic/claude-sonnet-4'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export type ChatSurface = 'ui' | 'slack'

export type ChatAgentMessage = { role: 'user' | 'assistant'; content: string }

export type ChatAgentEvent =
    | { type: 'content'; delta: string }
    | { type: 'toolCall'; id: string; name: string; arguments: Record<string, unknown> }
    | { type: 'toolResult'; id: string; name: string; result: unknown }
    | { type: 'proposal'; id: string; proposal: Proposal }
    | { type: 'error'; status?: number; error: string }

export type ChatAgentResult = {
    text: string
    proposals: Array<{ id: string; proposal: Proposal }>
}

export type RunChatAgentOptions = {
    firebaseApp: firebase.app.App
    eventId: string
    eventName: string
    openRouterApiKey: string
    model: string
    messages: ChatAgentMessage[]
    surface: ChatSurface
    signal?: AbortSignal
    onEvent: (event: ChatAgentEvent) => void
}

type OpenRouterToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } }

type OpenRouterMessage = {
    role: string
    content: string | null
    tool_calls?: OpenRouterToolCall[]
    tool_call_id?: string
    name?: string
}

const SURFACE_NOTES: Record<ChatSurface, string> = {
    ui: 'Write tools emit a proposal that the user reviews and approves in the UI.',
    slack: `Write tools emit a proposal that the user reviews with Apply / Reject buttons posted in the Slack thread.
Format replies for Slack mrkdwn: *bold* with single asterisks, _italic_, bullet lists with "-", no markdown headers, no tables. Keep replies short.`,
}

export const buildSystemPrompt = (eventId: string, eventName: string, surface: ChatSurface = 'ui') =>
    `You are an OpenPlanner assistant helping the user manage the event "${eventName}" (id: ${eventId}).

Read tools (listSessions, getSession, listSpeakers, getSpeaker, listSponsors, getEvent, getFaq) return data directly. listSessions/getSession/listSpeakers/getSpeaker return a lean default projection to keep token usage low; pass fields[] only when you actually need a heavier field (e.g. fields:["bio"] on listSpeakers, fields:["abstract"] on listSessions). Private fields (email, phone, note on speakers; note on sessions) are also opt-in via fields[] — request them only when the user's request actually needs them, and don't echo full email/phone lists back to the user unless they explicitly asked. Don't request fields you won't use.

Write tools (proposePatchSpeaker, proposePatchSession, proposePatchEvent, proposeDeleteSpeaker) DO NOT apply changes. ${SURFACE_NOTES[surface]} The tool result tells you whether the proposal was emitted successfully — it is NOT confirmation that the change happened. Never claim a change was made.

Batching:
- When the user asks for several related changes (e.g. "fix typos in all session titles", "set the language for tracks A and B"), emit ONE proposal per change in the same turn — they are grouped into a batch the user can approve or reject all at once.
- Cap a single batch at ~10 proposals; if more would be needed, do the most important ones first and ask the user to confirm before continuing.
- Group only changes that fit a single user request together. Don't mix unrelated edits.

Rules:
- Always call list/find tools before referring to a specific id; never invent ids. When you call a propose* tool, you MUST pass expectedSpeakerName / expectedSessionTitle that exactly matches what listSpeakers / listSessions returned for that id. The server uses it as a sanity check and rejects the call if the value doesn't match the document at the given id (this prevents you from accidentally proposing a change against the wrong speaker / session).
- If a propose* call comes back rejected with an "expected*…" message, RE-RUN the matching list tool to refresh the id+name pairs before retrying.
- Make the rationale match the same speaker / session you're patching: it appears next to the resolved name in the user's review card, so a mismatch is confusing.
- Keep responses concise.
- After a batch, end your reply with a short summary of what the user will see (e.g. "5 sessions queued for review").`

export const consumeOpenRouterStream = async (
    response: Response,
    onDelta: (delta: string) => void,
    isAborted: () => boolean = () => false
): Promise<{ message: OpenRouterMessage; finishReason: string | null }> => {
    if (!response.body) {
        throw new Error('OpenRouter response has no body')
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let assembledContent = ''
    const assembledToolCalls = new Map<number, OpenRouterToolCall>()
    let finishReason: string | null = null

    while (true) {
        if (isAborted()) {
            await reader.cancel().catch(() => undefined)
            break
        }
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
                const choice = JSON.parse(payload).choices?.[0]
                if (!choice) continue
                const delta = choice.delta ?? {}
                if (typeof delta.content === 'string' && delta.content.length > 0) {
                    assembledContent += delta.content
                    onDelta(delta.content)
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
                // malformed chunk, skip
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

const parseToolArguments = (raw: string): Record<string, any> => {
    if (!raw) return {}
    try {
        return JSON.parse(raw)
    } catch {
        return {}
    }
}

const PROPOSAL_CAP_ERROR = `Cap of ${MAX_PROPOSALS_PER_REQUEST} proposals per request reached. Stop emitting more write tools and ask the user to apply or reject the current batch first.`

const PROPOSAL_QUEUED_NOTE =
    'Proposal queued. All proposals from this turn are batched and the user will approve/reject them together. Continue if more related changes are needed for this user request, but do NOT claim any change has been applied yet.'

export const runChatAgent = async (options: RunChatAgentOptions): Promise<ChatAgentResult> => {
    const { eventId, eventName, openRouterApiKey, model, messages, surface, signal, onEvent } = options
    const isAborted = () => signal?.aborted === true

    const conversation: OpenRouterMessage[] = [
        { role: 'system', content: buildSystemPrompt(eventId, eventName, surface) },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
    ]
    const result: ChatAgentResult = { text: '', proposals: [] }
    let separatorPending = false

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        if (isAborted()) break
        const orResponse = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${openRouterApiKey}`,
                'HTTP-Referer': 'https://openplanner.fr',
                'X-Title': 'OpenPlanner',
            },
            body: JSON.stringify({
                model,
                stream: true,
                messages: conversation,
                tools: [...READ_ONLY_TOOLS, ...PROPOSAL_TOOLS],
            }),
            signal,
        })

        if (!orResponse.ok) {
            const text = await orResponse.text().catch(() => '')
            onEvent({ type: 'error', status: orResponse.status, error: text || orResponse.statusText })
            break
        }

        const { message, finishReason } = await consumeOpenRouterStream(
            orResponse,
            (delta) => {
                if (separatorPending && result.text.length > 0) result.text += '\n\n'
                separatorPending = false
                result.text += delta
                onEvent({ type: 'content', delta })
            },
            isAborted
        )
        conversation.push(message)

        if (isAborted() || finishReason !== 'tool_calls' || !message.tool_calls?.length) break
        separatorPending = true

        for (const tc of message.tool_calls) {
            const parsedArgs = parseToolArguments(tc.function.arguments)
            onEvent({ type: 'toolCall', id: tc.id, name: tc.function.name, arguments: parsedArgs })

            const toolResult = await runTool(options, result, tc.id, tc.function.name, parsedArgs)

            onEvent({ type: 'toolResult', id: tc.id, name: tc.function.name, result: toolResult })
            conversation.push({
                role: 'tool',
                tool_call_id: tc.id,
                name: tc.function.name,
                content: JSON.stringify(toolResult),
            })
        }
    }

    return result
}

const runTool = async (
    { firebaseApp, eventId, onEvent }: RunChatAgentOptions,
    result: ChatAgentResult,
    callId: string,
    name: string,
    args: Record<string, any>
): Promise<unknown> => {
    if (!isProposalTool(name)) {
        try {
            return await executeTool(firebaseApp, eventId, name, args)
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Unknown error' }
        }
    }
    if (result.proposals.length >= MAX_PROPOSALS_PER_REQUEST) {
        return { status: 'rejected', error: PROPOSAL_CAP_ERROR }
    }
    const built = await buildProposal({ firebaseApp, eventId, name, args })
    if (!built.ok) return { status: 'rejected', error: built.error }

    result.proposals.push({ id: callId, proposal: built.proposal })
    onEvent({ type: 'proposal', id: callId, proposal: built.proposal })
    return { status: 'pending_user_approval', note: PROPOSAL_QUEUED_NOTE }
}
