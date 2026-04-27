import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { EventDao } from '../../dao/eventDao'
import { SessionDao } from '../../dao/sessionDao'
import { SpeakerDao } from '../../dao/speakerDao'
import { READ_ONLY_TOOLS, executeTool } from './tools'
import { PROPOSAL_TOOLS, buildProposal, isProposalTool } from './proposalTools'
import { AiUsageDao } from '../../dao/aiUsageDao'

const MAX_MESSAGES = 50
const MAX_CONTENT_LENGTH = 50000
const MAX_TOOL_ROUNDS = 8
const MAX_PROPOSALS_PER_REQUEST = 25
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export const ChatMessage = Type.Object({
    // Deliberately exclude 'system' — the server injects its own system prompt.
    // Allowing client-supplied system messages would let callers override the
    // built-in guardrails / privacy framing.
    role: Type.Union([Type.Literal('user'), Type.Literal('assistant')]),
    content: Type.String({ maxLength: MAX_CONTENT_LENGTH }),
})

export const ChatStreamBody = Type.Object(
    {
        messages: Type.Array(ChatMessage, { minItems: 1, maxItems: MAX_MESSAGES }),
        model: Type.Optional(Type.String({ maxLength: 200 })),
    },
    { additionalProperties: false }
)

export type ChatStreamBodyType = Static<typeof ChatStreamBody>

export type ChatStreamPOSTTypes = {
    Params: { eventId: string }
    Querystring: { apiKey?: string }
    Body: ChatStreamBodyType
}

export const chatStreamPOSTSchema = {
    tags: ['chat'],
    summary: 'Stream the OpenPlanner chat assistant for an event (read + propose-write)',
    description:
        'Server-Sent Events stream. The server forwards OpenRouter deltas as `data: {...}\\n\\n` and executes whitelisted read tools server-side. Write tools (proposePatchSpeaker / proposePatchSession / proposePatchEvent / proposeDeleteSpeaker) NEVER mutate Firestore directly — they emit a `proposal` event with a field-level diff that the client renders for explicit user approval before the corresponding PATCH/DELETE endpoint is hit. A request is capped at 25 proposals (model batches related changes for review). The route also emits `usage` events so callers can track per-event monthly token spend.',
    params: {
        type: 'object',
        properties: { eventId: { type: 'string' } },
        required: ['eventId'],
    },
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
            apiKey: { type: 'string', description: 'The API key of the event' },
        },
    },
    body: ChatStreamBody,
    security: [{ apiKey: [] }],
}

const writeSSE = (reply: FastifyReply, data: unknown) => {
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
}

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

const buildSystemPrompt = (
    eventId: string,
    eventName: string
) => `You are an OpenPlanner assistant helping the user manage the event "${eventName}" (id: ${eventId}).

Read tools (listSessions, getSession, listSpeakers, getSpeaker, listSponsors, getEvent, getFaq) return data directly.

Write tools (proposePatchSpeaker, proposePatchSession, proposePatchEvent, proposeDeleteSpeaker) DO NOT apply changes. They emit a proposal that the user reviews and approves in the UI. The tool result tells you whether the proposal was emitted successfully — it is NOT confirmation that the change happened. Never claim a change was made.

Batching:
- When the user asks for several related changes (e.g. "fix typos in all session titles", "set the language for tracks A and B"), emit ONE proposal per change in the same turn — the UI groups them into a batch the user can approve or reject all at once.
- Cap a single batch at ~10 proposals; if more would be needed, do the most important ones first and ask the user to confirm before continuing.
- Group only changes that fit a single user request together. Don't mix unrelated edits.

Rules:
- Always call list/find tools before referring to a specific id; never invent ids.
- Keep responses concise.
- After a batch, end your reply with a short summary of what the user will see (e.g. "5 sessions queued for review").`

type RoundUsage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }

const consumeOpenRouterStream = async (
    response: Response,
    onDelta: (delta: any) => void,
    isAborted: () => boolean = () => false
): Promise<{ message: OpenRouterMessage; finishReason: string | null; usage: RoundUsage | null }> => {
    if (!response.body) {
        throw new Error('OpenRouter response has no body')
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let assembledContent = ''
    const assembledToolCalls = new Map<
        number,
        { id: string; type: 'function'; function: { name: string; arguments: string } }
    >()
    let finishReason: string | null = null
    let usage: RoundUsage | null = null

    while (true) {
        if (isAborted()) {
            try {
                await reader.cancel()
            } catch {
                /* noop */
            }
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
                const parsed = JSON.parse(payload)
                if (parsed.usage && typeof parsed.usage === 'object') {
                    usage = parsed.usage
                }
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
                if (choice.finish_reason) {
                    finishReason = choice.finish_reason
                }
            } catch {
                // skip malformed chunks silently
            }
        }
    }

    const toolCalls = Array.from(assembledToolCalls.values())
    const message: OpenRouterMessage = {
        role: 'assistant',
        content: assembledContent.length > 0 ? assembledContent : null,
    }
    if (toolCalls.length > 0) message.tool_calls = toolCalls
    return { message, finishReason, usage }
}

export const chatStreamRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string }
            Body: ChatStreamBodyType
        }>,
        reply: FastifyReply
    ) => {
        const { eventId } = request.params
        const { messages, model } = request.body

        const event = await EventDao.getEvent(fastify.firebase, eventId)
        const openRouterApiKey = (event as any).openRouterAPIKey
        if (!openRouterApiKey) {
            reply.status(400).send({
                error: 'OpenRouter API key is not set on this event. Add it under Event Settings → Other stuffs → OpenRouter API key.',
            })
            return
        }
        const chosenModel = model || (event as any).openRouterModel || 'anthropic/claude-sonnet-4'

        // Per-event monthly token cap. Stored as a non-negative integer; null /
        // undefined / 0 / NaN / negative all mean "no cap".
        //
        // Note: soft cap. The check (read usage) and the increment (after the
        // OpenRouter response) are not atomic, so two concurrent requests can
        // each pass the check before either has incremented. Strict enforcement
        // would need a transactional pre-reservation of an estimated token
        // budget reconciled against real usage afterward — fine to add later
        // if it ever becomes a problem; the assistant is admin-only today.
        const rawCap = Number((event as any).openRouterMonthlyTokenCap)
        const monthlyCap = Number.isFinite(rawCap) && Number.isInteger(rawCap) && rawCap > 0 ? rawCap : 0
        if (monthlyCap > 0) {
            const used = await AiUsageDao.getMonthTokens(fastify.firebase, eventId).catch(() => 0)
            if (used >= monthlyCap) {
                reply.status(429).send({
                    error: `Monthly OpenRouter token cap reached (${used.toLocaleString()} / ${monthlyCap.toLocaleString()}). Increase openRouterMonthlyTokenCap in event settings or wait for the next month.`,
                })
                return
            }
        }

        // Pre-compute small summary so the UI can render before the model emits anything.
        const [sessions, speakers] = await Promise.all([
            SessionDao.getSessions(fastify.firebase, eventId).catch(() => [] as unknown[]),
            SpeakerDao.getSpeakers(fastify.firebase, eventId).catch(() => [] as unknown[]),
        ])

        const requestOrigin = (request.headers.origin as string | undefined) || ''
        // CORS: reply.hijack() bypasses Fastify's onSend hook (and therefore
        // @fastify/cors), so CORS headers must be set manually here. We do NOT
        // send Access-Control-Allow-Credentials together with the wildcard
        // origin (browsers reject that combination). Only echo a concrete
        // Origin header back when one was provided by the request.
        const corsHeaders: Record<string, string> = requestOrigin
            ? {
                  'Access-Control-Allow-Origin': requestOrigin,
                  'Access-Control-Allow-Credentials': 'true',
                  Vary: 'Origin',
              }
            : { 'Access-Control-Allow-Origin': '*' }
        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            // Prevent any proxy / Firebase Hosting / Cloud Run intermediary from
            // gzipping the stream (compression buffers chunks until enough body
            // accumulates, which makes SSE arrive in one big lump).
            'Content-Encoding': 'identity',
            'X-Accel-Buffering': 'no',
            Connection: 'keep-alive',
            ...corsHeaders,
        })
        reply.hijack()
        // Track client disconnects so we can abort the upstream OpenRouter
        // fetch (and stop the tool-call loop) the moment the user navigates
        // away or the proxy drops the socket.
        const upstreamAbort = new AbortController()
        let clientGone = false
        const onClose = () => {
            clientGone = true
            try {
                upstreamAbort.abort()
            } catch {
                /* noop */
            }
        }
        reply.raw.on('close', onClose)
        request.raw.on?.('close', onClose)
        // Disable Nagle's algorithm so each write is flushed to the wire immediately.
        try {
            reply.raw.socket?.setNoDelay(true)
        } catch {
            /* socket may already be detached on some runtimes */
        }
        // Push 2KB of padding as an SSE comment so the browser's MIME sniffer
        // and any proxy buffer commit to the connection before the first real event.
        reply.raw.write(`: ${' '.repeat(2048)}\n\n`)

        try {
            writeSSE(reply, {
                type: 'eventSummary',
                event: {
                    id: event.id,
                    name: event.name,
                    dates: event.dates,
                    sessionsCount: sessions.length,
                    speakersCount: speakers.length,
                },
                model: chosenModel,
            })

            const conversation: OpenRouterMessage[] = [
                { role: 'system', content: buildSystemPrompt(eventId, event.name) },
                ...messages.map((m) => ({ role: m.role, content: m.content })),
            ]

            // Cap total proposals per request so the model can't run away with
            // thousands of writes. Counted across all tool-call rounds.
            let proposalsEmittedCount = 0
            for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
                if (clientGone) break
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
                        tools: [...READ_ONLY_TOOLS, ...PROPOSAL_TOOLS],
                    }),
                    signal: upstreamAbort.signal,
                })

                if (!orResponse.ok) {
                    const text = await orResponse.text().catch(() => '')
                    writeSSE(reply, {
                        type: 'error',
                        status: orResponse.status,
                        error: text || orResponse.statusText,
                    })
                    break
                }

                const { message, finishReason, usage } = await consumeOpenRouterStream(
                    orResponse,
                    (delta) => writeSSE(reply, delta),
                    () => clientGone
                )
                conversation.push(message)

                if (usage && (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens)) {
                    AiUsageDao.incrementUsage(fastify.firebase, eventId, {
                        prompt: usage.prompt_tokens || 0,
                        completion: usage.completion_tokens || 0,
                        total: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
                    }).catch((err) => {
                        // Don't fail the stream over usage bookkeeping.
                        console.warn('Failed to record AI usage:', err)
                    })
                    writeSSE(reply, { type: 'usage', usage })
                }

                if (clientGone || finishReason !== 'tool_calls' || !message.tool_calls?.length) {
                    break
                }

                for (const tc of message.tool_calls) {
                    let parsedArgs: Record<string, any> = {}
                    try {
                        parsedArgs = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}
                    } catch {
                        parsedArgs = {}
                    }
                    writeSSE(reply, {
                        type: 'toolCall',
                        id: tc.id,
                        name: tc.function.name,
                        arguments: parsedArgs,
                    })

                    let toolResult: unknown
                    if (isProposalTool(tc.function.name)) {
                        if (proposalsEmittedCount >= MAX_PROPOSALS_PER_REQUEST) {
                            toolResult = {
                                status: 'rejected',
                                error: `Cap of ${MAX_PROPOSALS_PER_REQUEST} proposals per request reached. Stop emitting more write tools and ask the user to apply or reject the current batch first.`,
                            }
                        } else {
                            const built = await buildProposal({
                                firebaseApp: fastify.firebase,
                                eventId,
                                name: tc.function.name,
                                args: parsedArgs,
                            })
                            if (!built.ok) {
                                toolResult = { status: 'rejected', error: built.error }
                            } else {
                                writeSSE(reply, { type: 'proposal', id: tc.id, proposal: built.proposal })
                                proposalsEmittedCount++
                                toolResult = {
                                    status: 'pending_user_approval',
                                    note: 'Proposal queued. The UI batches all proposals from this turn and the user will approve/reject them together. Continue if more related changes are needed for this user request, but do NOT claim any change has been applied yet.',
                                }
                            }
                        }
                    } else {
                        try {
                            toolResult = await executeTool(fastify.firebase, eventId, tc.function.name, parsedArgs)
                        } catch (error) {
                            toolResult = { error: error instanceof Error ? error.message : 'Unknown error' }
                        }
                    }

                    writeSSE(reply, {
                        type: 'toolResult',
                        id: tc.id,
                        name: tc.function.name,
                        result: toolResult,
                    })

                    conversation.push({
                        role: 'tool',
                        tool_call_id: tc.id,
                        name: tc.function.name,
                        content: JSON.stringify(toolResult),
                    })
                }
            }

            reply.raw.write('data: [DONE]\n\n')
        } catch (error) {
            const err = error as { name?: string }
            // AbortError is the expected outcome when the client disconnected.
            if (!clientGone && err?.name !== 'AbortError') {
                try {
                    writeSSE(reply, {
                        type: 'error',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    })
                } catch {
                    /* socket may already be closed */
                }
            }
        } finally {
            reply.raw.off('close', onClose)
            request.raw.off?.('close', onClose)
            try {
                reply.raw.end()
            } catch {
                /* noop */
            }
        }
    }
}
