import { FastifyInstance } from 'fastify'
import { addFilePOSTSchema, AddFilePOSTTypes, addFileRouteHandler } from './addFilePOST'

export const filesRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<AddFilePOSTTypes>(
        '/v1/:eventId/files',
        {
            schema: addFilePOSTSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        addFileRouteHandler(fastify)
    )
    done()
}
