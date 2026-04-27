import { FastifyInstance } from 'fastify'
import { updateSpeakerPATCHSchema, UpdateSpeakerPATCHTypes, updateSpeakerRouteHandler } from './updateSpeakerPATCH'
import { getSpeakersGETSchema, GetSpeakersGETTypes, getSpeakersRouteHandler } from './getSpeakersGET'
import { getSpeakerGETSchema, GetSpeakerGETTypes, getSpeakerRouteHandler } from './getSpeakerGET'
import { deleteSpeakerDELETESchema, DeleteSpeakerDELETETypes, deleteSpeakerRouteHandler } from './deleteSpeakerDELETE'

export const speakersRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.get<GetSpeakersGETTypes>(
        '/v1/:eventId/speakers',
        { schema: getSpeakersGETSchema, preHandler: fastify.auth([fastify.verifyApiKey]) },
        getSpeakersRouteHandler(fastify)
    )

    fastify.get<GetSpeakerGETTypes>(
        '/v1/:eventId/speakers/:speakerId',
        { schema: getSpeakerGETSchema, preHandler: fastify.auth([fastify.verifyApiKey]) },
        getSpeakerRouteHandler(fastify)
    )

    fastify.patch<UpdateSpeakerPATCHTypes>(
        '/v1/:eventId/speakers/:speakerId',
        {
            schema: updateSpeakerPATCHSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        updateSpeakerRouteHandler(fastify)
    )

    fastify.delete<DeleteSpeakerDELETETypes>(
        '/v1/:eventId/speakers/:speakerId',
        { schema: deleteSpeakerDELETESchema, preHandler: fastify.auth([fastify.verifyApiKey]) },
        deleteSpeakerRouteHandler(fastify)
    )

    done()
}
