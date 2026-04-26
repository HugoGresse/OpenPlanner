import { FastifyInstance } from 'fastify'
import { updateSpeakerPATCHSchema, UpdateSpeakerPATCHTypes, updateSpeakerRouteHandler } from './updateSpeakerPATCH'

export const speakersRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.patch<UpdateSpeakerPATCHTypes>(
        '/v1/:eventId/speakers/:speakerId',
        {
            schema: updateSpeakerPATCHSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        updateSpeakerRouteHandler(fastify)
    )

    done()
}
