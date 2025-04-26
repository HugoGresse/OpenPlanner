import { FastifyInstance } from 'fastify'
import { addFilePOSTSchema, AddFilePOSTTypes, addFileRouteHandler } from './addFilePOST'
import {
    downloadAndReuploadFilePOSTSchema,
    DownloadAndReuploadFilePOSTTypes,
    downloadAndReuploadFileRouteHandler,
} from './downloadAndReuploadFilePOST'

export const filesRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<AddFilePOSTTypes>(
        '/v1/:eventId/files',
        {
            schema: addFilePOSTSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        addFileRouteHandler(fastify)
    )

    fastify.post<DownloadAndReuploadFilePOSTTypes>(
        '/v1/:eventId/files/download-reupload',
        {
            schema: downloadAndReuploadFilePOSTSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        downloadAndReuploadFileRouteHandler(fastify)
    )

    done()
}
