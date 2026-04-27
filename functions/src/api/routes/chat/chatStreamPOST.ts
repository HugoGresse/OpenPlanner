import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { EventDao } from '../../dao/eventDao'
import { SessionDao } from '../../dao/sessionDao'
import { SpeakerDao } from '../../dao/speakerDao'
import { READ_ONLY_TOOLS, executeTool } from './tools'

const MAX_MESSAGES = 50
const MAX_CONTENT_LENGTH = 50000
const MAX_TOOL_ROUNDS = 8
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export const ChatMessage = Type.Object({
    role: Type.Union([Type.Literal('user'), Type.Literal('assistant'), Type.Literal('system')]),
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
    summary: 'Stream a chatbot response (read-only) for the event using OpenRouter + tool calling',
    description:
        'Server-Sent Events stream. The server forwards OpenRouter deltas as `data: {...}\\n\\n`. Tool execution happens server-side; only read-only tools are allowed in this version.',
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
) => `You are an OpenPlanner assistant helping the user explore the event "${eventName}" (id: ${eventId}).

You can READ event data via tools but you CANNOT mutate anything in this version of the assistant. Do not pretend to perform writes; if the user asks to edit something, explain that write support is coming in a later version.

Always call list/find tools (listSessions, listSpeakers, listSponsors, getFaq) before referring to specific IDs — never invent IDs. Keep responses concise.`

const consumeOpenRouterStream = async (
    response: Response,
    onDelta: (delta: any) => void
): Promise<{ message: OpenRouterMessage; finishReason: string | null }> => {
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
    return { message, finishReason }
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

        // Pre-compute small summary so the UI can render before the model emits anything.
        const [sessions, speakers] = await Promise.all([
            SessionDao.getSessions(fastify.firebase, eventId).catch(() => [] as unknown[]),
            SpeakerDao.getSpeakers(fastify.firebase, eventId).catch(() => [] as unknown[]),
        ])

        const requestOrigin = (request.headers.origin as string | undefined) || '*'
        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            Connection: 'keep-alive',
            // reply.hijack() bypasses Fastify's onSend hook, including @fastify/cors,
            // so CORS headers must be written manually.
            'Access-Control-Allow-Origin': requestOrigin,
            'Access-Control-Allow-Credentials': 'true',
            Vary: 'Origin',
        })
        reply.hijack()

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
                    writeSSE(reply, {
                        type: 'error',
                        status: orResponse.status,
                        error: text || orResponse.statusText,
                    })
                    break
                }

                const { message, finishReason } = await consumeOpenRouterStream(orResponse, (delta) =>
                    writeSSE(reply, delta)
                )
                conversation.push(message)

                if (finishReason !== 'tool_calls' || !message.tool_calls?.length) {
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
                    try {
                        toolResult = await executeTool(fastify.firebase, eventId, tc.function.name, parsedArgs)
                    } catch (error) {
                        toolResult = { error: error instanceof Error ? error.message : 'Unknown error' }
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
            writeSSE(reply, {
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
            })
        } finally {
            reply.raw.end()
        }
    }
}
