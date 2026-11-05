import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { SponsorDao } from '../../dao/sponsorDao'
import { NotFoundError } from '../../other/Errors'
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
    params: eventIdParams({ categoryId: 'Sponsor category ID' }),
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
            if (error instanceof NotFoundError) {
                reply.status(404).send(`Sponsor category not found: ${categoryId}`)
                return
            }
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to delete sponsor category: ${msg}`)
        }
    }
}
