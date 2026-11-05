import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { TeamDao } from '../../dao/teamDao'
import { replyDaoError } from '../../other/daoErrors'
import { apiKeyQuerystring, apiKeySecurity, eventIdParams } from '../../other/routeSchemas'

export type DeleteTeamMemberDELETETypes = {
    Params: { eventId: string; memberId: string }
    Querystring: { apiKey?: string }
    Reply: { success: boolean } | string
}

export const deleteTeamMemberDELETESchema = {
    tags: ['team'],
    summary: 'Delete a team member',
    description: 'Deletes a team member by ID. Returns 404 if the member does not exist.',
    params: eventIdParams({ memberId: Type.String({ description: 'Team member ID' }) }),
    querystring: apiKeyQuerystring,
    response: {
        200: Type.Object({ success: Type.Boolean() }),
        400: Type.String(),
        404: Type.String(),
    },
    security: apiKeySecurity,
}

export const deleteTeamMemberRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Params: { eventId: string; memberId: string } }>, reply: FastifyReply) => {
        const { eventId, memberId } = request.params
        try {
            await TeamDao.deleteMember(fastify.firebase, eventId, memberId)
            reply.status(200).send({ success: true })
        } catch (error: unknown) {
            replyDaoError(reply, error, {
                notFound: `Team member not found: ${memberId}`,
                failed: 'Failed to delete team member',
            })
        }
    }
}
