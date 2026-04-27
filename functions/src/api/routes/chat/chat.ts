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
    done()
}
