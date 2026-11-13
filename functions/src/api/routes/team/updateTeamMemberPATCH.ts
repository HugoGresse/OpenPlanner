import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { TeamDao } from '../../dao/teamDao'
import { TeamMember } from '../../../../../src/types'
import { replyDaoError } from '../../other/daoErrors'
import { apiKeyQuerystring, apiKeySecurity, eventIdParams } from '../../other/routeSchemas'
import { withSocialIcons } from '../../other/socials'
import { TypeBoxPatchTeamMember } from './teamSchemas'

export type PatchTeamMemberType = Static<typeof TypeBoxPatchTeamMember>

export type UpdateTeamMemberPATCHTypes = {
    Params: { eventId: string; memberId: string }
    Querystring: { apiKey?: string }
    Body: PatchTeamMemberType
    Reply: { success: boolean } | string
}

export const updateTeamMemberPATCHSchema = {
    tags: ['team'],
    summary: 'Update a team member',
    description:
        'Partial update of a team member: only the given fields change. The id cannot change. Unknown fields are rejected, 404 when the member does not exist.',
    params: eventIdParams({ memberId: Type.String({ description: 'Team member ID' }) }),
    querystring: apiKeyQuerystring,
    body: TypeBoxPatchTeamMember,
    response: {
        200: Type.Object({ success: Type.Boolean() }),
        400: Type.String(),
        404: Type.String(),
    },
    security: apiKeySecurity,
}

export const toTeamMemberPatch = ({ socials, ...rest }: PatchTeamMemberType): Partial<Omit<TeamMember, 'id'>> =>
    socials ? { ...rest, socials: withSocialIcons(socials) } : rest

export const updateTeamMemberRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{ Params: { eventId: string; memberId: string }; Body: PatchTeamMemberType }>,
        reply: FastifyReply
    ) => {
        const { eventId, memberId } = request.params
        try {
            await TeamDao.updateMember(fastify.firebase, eventId, memberId, toTeamMemberPatch(request.body))
            reply.status(200).send({ success: true })
        } catch (error: unknown) {
            replyDaoError(reply, error, {
                notFound: `Team member not found: ${memberId}`,
                failed: 'Failed to update team member',
            })
        }
    }
}
