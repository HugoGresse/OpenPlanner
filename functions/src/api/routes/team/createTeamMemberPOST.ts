import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { TeamDao } from '../../dao/teamDao'
import { TeamMember } from '../../../../../src/types'
import { apiKeyQuerystring, apiKeySecurity, eventIdParams } from '../../other/routeSchemas'
import { slugify } from '../../other/slugify'
import { withSocialIcons } from '../../other/socials'
import { TypeBoxCreateTeamMember } from './teamSchemas'

export type CreateTeamMemberType = Static<typeof TypeBoxCreateTeamMember>

export type CreateTeamMemberPOSTTypes = {
    Params: { eventId: string }
    Querystring: { apiKey?: string }
    Body: CreateTeamMemberType
    Reply: { id: string } | string
}

export const createTeamMemberPOSTSchema = {
    tags: ['team'],
    summary: 'Add a team member',
    description:
        'Creates one team member. The id defaults to the slugified name, as in the web admin (409 when it already exists). `team` defaults to "default".',
    params: eventIdParams(),
    querystring: apiKeyQuerystring,
    body: TypeBoxCreateTeamMember,
    response: {
        201: Type.Object({ id: Type.String() }),
        400: Type.String(),
        409: Type.String(),
    },
    security: apiKeySecurity,
}

export const toTeamMember = (body: CreateTeamMemberType): TeamMember => ({
    id: body.id || slugify(body.name),
    name: body.name,
    bio: body.bio ?? null,
    role: body.role ?? '',
    team: body.team || 'default',
    order: body.order ?? 0,
    teamOrder: body.teamOrder ?? 0,
    photoUrl: body.photoUrl ?? null,
    socials: withSocialIcons(body.socials || []),
})

export const createTeamMemberRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{ Params: { eventId: string }; Body: CreateTeamMemberType }>,
        reply: FastifyReply
    ) => {
        const { eventId } = request.params
        const member = toTeamMember(request.body)
        if (!member.id) {
            reply.status(400).send('The name yields an empty id, pass an explicit id')
            return
        }

        try {
            if (await TeamDao.getMember(fastify.firebase, eventId, member.id)) {
                reply.status(409).send(`Team member already exists: ${member.id}`)
                return
            }
            await TeamDao.createMember(fastify.firebase, eventId, member)
            reply.status(201).send({ id: member.id })
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to add team member: ${msg}`)
        }
    }
}
