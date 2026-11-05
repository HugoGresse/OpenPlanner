import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { SponsorDao } from '../../dao/sponsorDao'
import { replyDaoError } from '../../other/daoErrors'
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
    params: eventIdParams({ sponsorId: Type.String({ description: 'Sponsor ID' }) }),
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
            replyDaoError(reply, error, {
                notFound: `Sponsor not found: ${sponsorId}`,
                failed: 'Failed to delete sponsor',
            })
        }
    }
}
