import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { EventDao } from '../../dao/eventDao'
import { SessionDao } from '../../dao/sessionDao'
import { SpeakerDao } from '../../dao/speakerDao'
import { DEFAULT_CHAT_MODEL, MAX_CONTENT_LENGTH, MAX_MESSAGES, runChatAgent } from './chatAgent'

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
        'Server-Sent Events stream. The server forwards OpenRouter deltas as `data: {...}\\n\\n` and executes whitelisted read tools server-side. Write tools (proposePatchSpeaker / proposePatchSession / proposePatchEvent / proposeDeleteSpeaker) NEVER mutate Firestore directly — they emit a `proposal` event with a field-level diff that the client renders for explicit user approval before the corresponding PATCH/DELETE endpoint is hit. A request is capped at 25 proposals (model batches related changes for review).',
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

// reply.hijack() bypasses Fastify's onSend hook (and therefore @fastify/cors),
// so CORS headers are set manually. Credentials are never combined with the
// wildcard origin (browsers reject that pair).
const corsHeadersFor = (requestOrigin: string): Record<string, string> =>
    requestOrigin
        ? { 'Access-Control-Allow-Origin': requestOrigin, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' }
        : { 'Access-Control-Allow-Origin': '*' }

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
        const openRouterApiKey = event.openRouterAPIKey
        if (!openRouterApiKey) {
            reply.status(400).send({
                error: 'OpenRouter API key is not set on this event. Add it under Event Settings → Other stuffs → OpenRouter API key.',
            })
            return
        }
        const chosenModel = model || event.openRouterModel || DEFAULT_CHAT_MODEL

        const [sessions, speakers] = await Promise.all([
            SessionDao.getSessions(fastify.firebase, eventId).catch(() => [] as unknown[]),
            SpeakerDao.getSpeakers(fastify.firebase, eventId).catch(() => [] as unknown[]),
        ])

        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            // Stops proxies / Firebase Hosting / Cloud Run from gzipping the
            // stream, which would buffer SSE chunks into one big lump.
            'Content-Encoding': 'identity',
            'X-Accel-Buffering': 'no',
            Connection: 'keep-alive',
            ...corsHeadersFor((request.headers.origin as string | undefined) || ''),
        })
        reply.hijack()

        const upstreamAbort = new AbortController()
        let clientGone = false
        const onClose = () => {
            clientGone = true
            upstreamAbort.abort()
        }
        reply.raw.on('close', onClose)
        request.raw.on?.('close', onClose)
        try {
            reply.raw.socket?.setNoDelay(true)
        } catch {
            /* socket may already be detached on some runtimes */
        }
        // 2KB SSE comment so the browser MIME sniffer and proxy buffers commit
        // to the connection before the first real event.
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

            await runChatAgent({
                firebaseApp: fastify.firebase,
                eventId,
                eventName: event.name,
                openRouterApiKey,
                model: chosenModel,
                messages,
                surface: 'ui',
                signal: upstreamAbort.signal,
                onEvent: (agentEvent) => {
                    if (!clientGone) writeSSE(reply, agentEvent)
                },
            })

            reply.raw.write('data: [DONE]\n\n')
        } catch (error) {
            const err = error as { name?: string }
            if (!clientGone && err?.name !== 'AbortError') {
                try {
                    writeSSE(reply, { type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })
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
