import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { SessionDao } from '../../dao/sessionDao'
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
    params: eventIdParams({ sessionId: 'Session ID' }),
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
            if (error instanceof Error && error.message === 'Session not found') {
                reply.status(404).send(`Session not found: ${sessionId}`)
                return
            }
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to delete session: ${msg}`)
        }
    }
}
