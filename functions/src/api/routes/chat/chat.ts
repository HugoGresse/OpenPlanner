import { FastifyInstance } from 'fastify'
import { chatStreamPOSTSchema, ChatStreamPOSTTypes, chatStreamRouteHandler } from './chatStreamPOST'

export const chatRoutes = (fastify: FastifyInstance, _options: any, done: () => any) => {
    fastify.post<ChatStreamPOSTTypes>(
        '/v1/:eventId/chat',
        {
            schema: chatStreamPOSTSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        chatStreamRouteHandler(fastify)
    )

    // Diagnostic-only endpoint: writes 5 SSE events 400 ms apart with no upstream
    // dependency. Use it to confirm whether streaming actually reaches the
    // browser. If chunks arrive together with /chat-diag too, the buffering
    // is in the hosting / runtime layer (not in our chat handler logic).
    fastify.get(
        '/v1/:eventId/chat-diag',
        {
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            const requestOrigin = (request.headers.origin as string | undefined) || '*'
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
            for (let i = 0; i < 5; i++) {
                reply.raw.write(`data: ${JSON.stringify({ i, t: Date.now() })}\n\n`)
                await new Promise((r) => setTimeout(r, 400))
            }
            reply.raw.write('data: [DONE]\n\n')
            reply.raw.end()
        }
    )

    done()
}
