import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { FaqDao } from '../../dao/faqDao'
import { NotFoundError } from '../../other/Errors'
import { apiKeyQuerystring, apiKeySecurity, eventIdParams } from '../../other/routeSchemas'

export type DeleteFaqQuestionDELETETypes = {
    Params: { eventId: string; categoryId: string; questionId: string }
    Querystring: { apiKey?: string }
    Reply: { success: boolean } | string
}

export const deleteFaqQuestionDELETESchema = {
    tags: ['faq'],
    summary: 'Delete a FAQ question',
    description: 'Deletes one question of a FAQ category. Returns 404 if the question does not exist.',
    params: eventIdParams({ categoryId: 'FAQ category ID', questionId: 'FAQ question ID' }),
    querystring: apiKeyQuerystring,
    response: {
        200: Type.Object({ success: Type.Boolean() }),
        400: Type.String(),
        404: Type.String(),
    },
    security: apiKeySecurity,
}

export const deleteFaqQuestionRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{ Params: { eventId: string; categoryId: string; questionId: string } }>,
        reply: FastifyReply
    ) => {
        const { eventId, categoryId, questionId } = request.params
        try {
            await FaqDao.deleteFaqQuestion(fastify.firebase, eventId, categoryId, questionId)
            reply.status(200).send({ success: true })
        } catch (error: unknown) {
            if (error instanceof NotFoundError) {
                reply.status(404).send(`FAQ question not found: ${questionId}`)
                return
            }
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to delete FAQ question: ${msg}`)
        }
    }
}
