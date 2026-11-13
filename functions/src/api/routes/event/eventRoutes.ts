import { FastifyInstance } from 'fastify'
import { strictBodyValidatorCompiler } from '../../other/strictValidator'
import { exportSchedulePdfRoute } from './exportSchedulePdf'
import { getEventRoute } from './getEvent'
import { getPdfMetadataRoute } from './getPdfMetadata'
import { getEventDetailsGETSchema, GetEventDetailsGETTypes, getEventDetailsRouteHandler } from './getEventDetailsGET'
import { patchEventPATCHSchema, PatchEventPATCHTypes, patchEventRouteHandler } from './patchEventPATCH'

export const eventRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    getEventRoute(fastify, options, () => {})
    exportSchedulePdfRoute(fastify, options, () => {})
    getPdfMetadataRoute(fastify, options, () => {})

    fastify.get<GetEventDetailsGETTypes>(
        '/v1/:eventId/event/details',
        { schema: getEventDetailsGETSchema, preHandler: fastify.auth([fastify.verifyApiKey]) },
        getEventDetailsRouteHandler(fastify)
    )

    fastify.patch<PatchEventPATCHTypes>(
        '/v1/:eventId/event',
        {
            schema: patchEventPATCHSchema,
            validatorCompiler: strictBodyValidatorCompiler,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        patchEventRouteHandler(fastify)
    )

    done()
}
