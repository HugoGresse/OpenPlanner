import { FastifyInstance } from 'fastify'
import { chatStreamPOSTSchema, ChatStreamPOSTTypes, chatStreamRouteHandler } from './chatStreamPOST'
import { aiActionsPOSTSchema, AiActionsPOSTTypes, aiActionsRouteHandler } from './aiActionsPOST'

export const chatRoutes = (fastify: FastifyInstance, _options: any, done: () => any) => {
    fastify.post<ChatStreamPOSTTypes>(
        '/v1/:eventId/chat',
        {
            schema: chatStreamPOSTSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        chatStreamRouteHandler(fastify)
    )

    fastify.post<AiActionsPOSTTypes>(
        '/v1/:eventId/ai-actions',
        {
            schema: aiActionsPOSTSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        aiActionsRouteHandler(fastify)
    )
    done()
}
