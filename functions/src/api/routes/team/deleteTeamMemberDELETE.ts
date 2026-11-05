import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { TeamDao } from '../../dao/teamDao'
import { NotFoundError } from '../../other/Errors'
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
    params: eventIdParams({ memberId: 'Team member ID' }),
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
            if (error instanceof NotFoundError) {
                reply.status(404).send(`Team member not found: ${memberId}`)
                return
            }
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to delete team member: ${msg}`)
        }
    }
}
