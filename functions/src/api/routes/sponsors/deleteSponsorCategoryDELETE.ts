import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { SponsorDao } from '../../dao/sponsorDao'
import { replyDaoError } from '../../other/daoErrors'
import { apiKeyQuerystring, apiKeySecurity, eventIdParams } from '../../other/routeSchemas'

export type DeleteSponsorCategoryDELETETypes = {
    Params: { eventId: string; categoryId: string }
    Querystring: { apiKey?: string }
    Reply: { success: boolean } | string
}

export const deleteSponsorCategoryDELETESchema = {
    tags: ['sponsors'],
    summary: 'Delete a sponsor category',
    description: 'Deletes a sponsor category and every sponsor in it. Returns 404 if the category does not exist.',
    params: eventIdParams({ categoryId: Type.String({ description: 'Sponsor category ID' }) }),
    querystring: apiKeyQuerystring,
    response: {
        200: Type.Object({ success: Type.Boolean() }),
        400: Type.String(),
        404: Type.String(),
    },
    security: apiKeySecurity,
}

export const deleteSponsorCategoryRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{ Params: { eventId: string; categoryId: string } }>,
        reply: FastifyReply
    ) => {
        const { eventId, categoryId } = request.params
        try {
            await SponsorDao.deleteCategory(fastify.firebase, eventId, categoryId)
            reply.status(200).send({ success: true })
        } catch (error: unknown) {
            replyDaoError(reply, error, {
                notFound: `Sponsor category not found: ${categoryId}`,
                failed: 'Failed to delete sponsor category',
            })
        }
    }
}
