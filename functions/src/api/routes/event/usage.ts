import { FastifyInstance } from 'fastify'
import Type, { Static } from 'typebox'
import { UsageDao } from '../../dao/usageDao'

const UsageReply = Type.Object({
    storage: Type.Object({
        totalBytes: Type.Number(),
        fileCount: Type.Number(),
        topFiles: Type.Array(Type.Object({ name: Type.String(), sizeBytes: Type.Number() })),
    }),
    network: Type.Object({
        available: Type.Boolean(),
        days: Type.Array(Type.Object({ date: Type.String(), bytes: Type.Number(), requests: Type.Number() })),
        totalBytes: Type.Number(),
    }),
})
type UsageReplyType = Static<typeof UsageReply>

export const usageRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.get<{ Reply: UsageReplyType }>(
        '/v1/:eventId/usage',
        {
            schema: {
                tags: ['event'],
                summary: 'Storage and network usage of this event (files stored, bytes served)',
                querystring: Type.Object({
                    apiKey: Type.String(),
                }),
                response: {
                    200: UsageReply,
                    400: Type.String(),
                    401: Type.String(),
                },
                security: [{ apiKey: [] }],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            const { eventId } = request.params as { eventId: string }
            const [storage, network] = await Promise.all([
                UsageDao.getStorageUsage(fastify.firebase, eventId),
                UsageDao.getNetworkUsage(fastify.firebase, eventId),
            ])
            reply.status(200).send({ storage, network })
        }
    )

    done()
}
