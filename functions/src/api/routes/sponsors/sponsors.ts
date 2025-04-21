import { FastifyInstance } from 'fastify'
import { addSponsorRouteHandler, addSponsorPOSTSchema, AddSponsorPOSTTypes } from './addSponsorsPOST'

export { SponsorType } from './addSponsorsPOST'

export const sponsorsRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<AddSponsorPOSTTypes>(
        '/v1/:eventId/sponsors',
        {
            schema: addSponsorPOSTSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        addSponsorRouteHandler(fastify)
    )
    done()
}
