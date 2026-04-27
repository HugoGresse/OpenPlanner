import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { EventDao } from '../../dao/eventDao'
import { MAX_CONTENT_LENGTH, MAX_MESSAGES, runChatStream } from './chatStreamEngine'

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

        // Pre-flight check so we can return a proper JSON 400 (instead of an SSE
        // error event over a 200 response) when the event hasn't configured an
        // OpenRouter API key yet.
        const event = await EventDao.getEvent(fastify.firebase, eventId)
        if (!(event as any).openRouterAPIKey) {
            reply.status(400).send({
                error: 'OpenRouter API key is not set on this event. Add it under Event Settings → Other stuffs → OpenRouter API key.',
            })
            return
        }

        const requestOrigin = (request.headers.origin as string | undefined) || '*'
        try {
            reply.raw.writeHead(200, {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'Content-Encoding': 'identity',
                'X-Accel-Buffering': 'no',
                Connection: 'keep-alive',
                'Access-Control-Allow-Origin': requestOrigin,
                'Access-Control-Allow-Credentials': 'true',
                Vary: 'Origin',
            })
            reply.hijack()
            try {
                reply.raw.socket?.setNoDelay(true)
            } catch {
                /* noop */
            }
            reply.raw.write(`: ${' '.repeat(2048)}\n\n`)

            await runChatStream({
                firebaseApp: fastify.firebase,
                eventId,
                messages,
                model,
                onEvent: (data) => writeSSE(reply, data),
            })

            reply.raw.write('data: [DONE]\n\n')
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error'
            try {
                writeSSE(reply, { type: 'error', error: msg })
            } catch {
                /* response may already be ended */
            }
        } finally {
            try {
                reply.raw.end()
            } catch {
                /* noop */
            }
        }
    }
}
