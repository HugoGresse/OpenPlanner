import { FastifyInstance } from 'fastify'
import { chatStreamPOSTSchema, ChatStreamPOSTTypes, chatStreamRouteHandler } from './chatStreamPOST'

// The chat route is wired through the main Fastify-backed `api` function for
// schema validation + apiKey verification. The actual streaming endpoint that
// the browser hits is exported as a dedicated Cloud Function (see
// functions/src/api/chatStreamFunction.ts) so the SSE response bypasses
// Fastify's response pipeline entirely. The Fastify-mounted version below is
// kept available for environments that don't go through Hosting (e.g. local
// emulator with a single function URL).
export const chatRoutes = (fastify: FastifyInstance, _options: any, done: () => any) => {
    fastify.post<ChatStreamPOSTTypes>(
        '/v1/:eventId/chat',
        {
            schema: chatStreamPOSTSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        chatStreamRouteHandler(fastify)
    )
    done()
}
