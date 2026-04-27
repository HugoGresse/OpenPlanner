import { FastifyInstance } from 'fastify'
import { EventDao } from '../../dao/eventDao'
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

    // Diagnostic-only: hit OpenRouter directly and pipe its raw SSE bytes to the
    // client with per-chunk console.log timestamps. Lets us verify whether
    // OpenRouter (and Node fetch) actually streams chunks in our environment.
    fastify.get(
        '/v1/:eventId/chat-or-diag',
        {
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            const { eventId } = request.params as { eventId: string }
            const event = await EventDao.getEvent(fastify.firebase, eventId)
            const orKey = (event as any).openRouterAPIKey
            if (!orKey) {
                reply.status(400).send({ error: 'OpenRouter API key not set on this event' })
                return
            }
            const model = (event as any).openRouterModel || 'anthropic/claude-sonnet-4'

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

            const t0 = Date.now()
            const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${orKey}`,
                    'HTTP-Referer': 'https://openplanner.fr',
                    'X-Title': 'OpenPlanner',
                    Accept: 'text/event-stream',
                },
                body: JSON.stringify({
                    model,
                    stream: true,
                    messages: [
                        { role: 'system', content: 'You speak in short numbered points.' },
                        { role: 'user', content: 'Count from 1 to 10, one number per line.' },
                    ],
                }),
            })

            console.log(`[chat-or-diag] OR response headers @ ${Date.now() - t0}ms status=${orResponse.status}`)
            if (!orResponse.ok || !orResponse.body) {
                reply.raw.write(
                    `data: ${JSON.stringify({ error: 'OpenRouter call failed', status: orResponse.status })}\n\n`
                )
                reply.raw.end()
                return
            }

            const reader = orResponse.body.getReader()
            let chunkIdx = 0
            while (true) {
                const { value, done } = await reader.read()
                if (done) break
                const ms = Date.now() - t0
                console.log(`[chat-or-diag] chunk #${chunkIdx} t=${ms}ms size=${value?.byteLength ?? 0}`)
                reply.raw.write(`data: ${JSON.stringify({ chunkIdx, t: ms, size: value?.byteLength ?? 0 })}\n\n`)
                chunkIdx++
            }
            reply.raw.write('data: [DONE]\n\n')
            reply.raw.end()
        }
    )

    done()
}
