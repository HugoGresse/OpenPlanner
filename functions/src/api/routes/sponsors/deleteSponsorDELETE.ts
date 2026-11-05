import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { SponsorDao } from '../../dao/sponsorDao'
import { NotFoundError } from '../../other/Errors'
import { apiKeyQuerystring, apiKeySecurity, eventIdParams } from '../../other/routeSchemas'

export type DeleteSponsorDELETETypes = {
    Params: { eventId: string; sponsorId: string }
    Querystring: { apiKey?: string }
    Reply: { success: boolean; categoryId: string } | string
}

export const deleteSponsorDELETESchema = {
    tags: ['sponsors'],
    summary: 'Delete a sponsor',
    description:
        'Removes a sponsor from its category (the category is kept). Returns the category id it was removed from, 404 if no category holds it.',
    params: eventIdParams({ sponsorId: 'Sponsor ID' }),
    querystring: apiKeyQuerystring,
    response: {
        200: Type.Object({ success: Type.Boolean(), categoryId: Type.String() }),
        400: Type.String(),
        404: Type.String(),
    },
    security: apiKeySecurity,
}

export const deleteSponsorRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Params: { eventId: string; sponsorId: string } }>, reply: FastifyReply) => {
        const { eventId, sponsorId } = request.params
        try {
            const categoryId = await SponsorDao.deleteSponsor(fastify.firebase, eventId, sponsorId)
            reply.status(200).send({ success: true, categoryId })
        } catch (error: unknown) {
            if (error instanceof NotFoundError) {
                reply.status(404).send(`Sponsor not found: ${sponsorId}`)
                return
            }
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to delete sponsor: ${msg}`)
        }
    }
}
