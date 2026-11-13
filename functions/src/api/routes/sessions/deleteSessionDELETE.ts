import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { SessionDao } from '../../dao/sessionDao'
import { replyDaoError } from '../../other/daoErrors'
import { apiKeyQuerystring, apiKeySecurity, eventIdParams } from '../../other/routeSchemas'

export type DeleteSessionDELETETypes = {
    Params: { eventId: string; sessionId: string }
    Querystring: { apiKey?: string }
    Reply: { success: boolean } | string
}

export const deleteSessionDELETESchema = {
    tags: ['sessions'],
    summary: 'Delete a session',
    description: 'Deletes a session by ID. Its speakers are kept. Returns 404 if the session does not exist.',
    params: eventIdParams({ sessionId: Type.String({ description: 'Session ID' }) }),
    querystring: apiKeyQuerystring,
    response: {
        200: Type.Object({ success: Type.Boolean() }),
        400: Type.String(),
        404: Type.String(),
    },
    security: apiKeySecurity,
}

export const deleteSessionRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Params: { eventId: string; sessionId: string } }>, reply: FastifyReply) => {
        const { eventId, sessionId } = request.params
        try {
            await SessionDao.deleteSession(fastify.firebase, eventId, sessionId)
            reply.status(200).send({ success: true })
        } catch (error: unknown) {
            replyDaoError(reply, error, {
                notFound: `Session not found: ${sessionId}`,
                failed: 'Failed to delete session',
            })
        }
    }
}
