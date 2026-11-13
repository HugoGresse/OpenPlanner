import { FastifyInstance } from 'fastify'
import Type, { Static } from 'typebox'
import { UsageDao } from '../../dao/usageDao'

const AdminUsageReply = Type.Object({
    totalStorageBytes: Type.Number(),
    totalFileCount: Type.Number(),
    networkAvailable: Type.Boolean(),
    totalNetworkBytes: Type.Number(),
    networkDays: Type.Array(Type.Object({ date: Type.String(), bytes: Type.Number(), requests: Type.Number() })),
    events: Type.Array(
        Type.Object({
            eventId: Type.String(),
            storageBytes: Type.Number(),
            fileCount: Type.Number(),
            networkBytes: Type.Number(),
            networkRequests: Type.Number(),
        })
    ),
})
type AdminUsageReplyType = Static<typeof AdminUsageReply>

export const adminUsageRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.get<{ Reply: AdminUsageReplyType }>(
        '/v1/admin/usage',
        {
            schema: {
                tags: ['admin'],
                summary: 'Super-admin: storage and network usage of every event',
                response: {
                    200: AdminUsageReply,
                    401: Type.Object({ error: Type.String() }),
                    403: Type.Object({ error: Type.String() }),
                },
                security: [{ bearerAuth: [] }],
            },
            preHandler: fastify.auth([fastify.verifySuperAdmin]),
        },
        async (request, reply) => {
            const usage = await UsageDao.getGlobalUsage(fastify.firebase)
            reply.status(200).send(usage)
        }
    )

    done()
}
