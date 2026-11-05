import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { FaqDao } from '../../dao/faqDao'
import { NotFoundError } from '../../other/Errors'
import { apiKeyQuerystring, apiKeySecurity, eventIdParams } from '../../other/routeSchemas'

export type DeleteFaqCategoryDELETETypes = {
    Params: { eventId: string; categoryId: string }
    Querystring: { apiKey?: string }
    Reply: { success: boolean } | string
}

export const deleteFaqCategoryDELETESchema = {
    tags: ['faq'],
    summary: 'Delete a FAQ category',
    description: 'Deletes a FAQ category and all its questions. Returns 404 if the category does not exist.',
    params: eventIdParams({ categoryId: 'FAQ category ID' }),
    querystring: apiKeyQuerystring,
    response: {
        200: Type.Object({ success: Type.Boolean() }),
        400: Type.String(),
        404: Type.String(),
    },
    security: apiKeySecurity,
}

export const deleteFaqCategoryRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{ Params: { eventId: string; categoryId: string } }>,
        reply: FastifyReply
    ) => {
        const { eventId, categoryId } = request.params
        try {
            await FaqDao.deleteFaqCategory(fastify.firebase, eventId, categoryId)
            reply.status(200).send({ success: true })
        } catch (error: unknown) {
            if (error instanceof NotFoundError) {
                reply.status(404).send(`FAQ category not found: ${categoryId}`)
                return
            }
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to delete FAQ category: ${msg}`)
        }
    }
}
