import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { TeamDao } from '../../dao/teamDao'
import { apiKeyQuerystring, apiKeySecurity, eventIdParams } from '../../other/routeSchemas'
import { TeamMemberSchema } from './teamSchemas'

export type GetTeamGETTypes = {
    Params: { eventId: string }
    Querystring: { apiKey?: string }
}

export const getTeamGETSchema = {
    tags: ['team'],
    summary: 'List team members',
    description:
        'Every team member of the event (`team`), plus the same members grouped and ordered by team (`teams`).',
    params: eventIdParams(),
    querystring: apiKeyQuerystring,
    response: {
        200: Type.Object({
            team: Type.Array(TeamMemberSchema),
            teams: Type.Array(
                Type.Object({ id: Type.String(), order: Type.Number(), members: Type.Array(TeamMemberSchema) })
            ),
        }),
        400: Type.String(),
    },
    security: apiKeySecurity,
}

export const getTeamRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Params: { eventId: string } }>, reply: FastifyReply) => {
        try {
            reply.status(200).send(await TeamDao.getTeams(fastify.firebase, request.params.eventId))
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to list team: ${msg}`)
        }
    }
}
