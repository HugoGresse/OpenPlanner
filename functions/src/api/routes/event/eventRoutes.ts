import { FastifyInstance } from 'fastify'
import { exportSchedulePdfRoute } from './exportSchedulePdf'
import { getEventRoute } from './getEvent'
import { getPdfMetadataRoute } from './getPdfMetadata'
import { patchEventPATCHSchema, PatchEventPATCHTypes, patchEventRouteHandler } from './patchEventPATCH'

export const eventRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    getEventRoute(fastify, options, () => {})
    exportSchedulePdfRoute(fastify, options, () => {})
    getPdfMetadataRoute(fastify, options, () => {})

    fastify.patch<PatchEventPATCHTypes>(
        '/v1/:eventId/event',
        { schema: patchEventPATCHSchema, preHandler: fastify.auth([fastify.verifyApiKey]) },
        patchEventRouteHandler(fastify)
    )

    done()
}
