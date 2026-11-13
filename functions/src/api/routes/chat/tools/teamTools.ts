import { TeamDao } from '../../../dao/teamDao'
import { TeamMember } from '../../../../../../src/types'
import { CreateTeamMemberType, toTeamMember } from '../../team/createTeamMemberPOST'
import { TypeBoxCreateTeamMember, TypeBoxPatchTeamMember } from '../../team/teamSchemas'
import {
    ChatTool,
    endpointFor,
    expectedMismatch,
    expectedParam,
    IRREVERSIBLE,
    objectSchema,
    pickSchemaFields,
    proposed,
    RATIONALE_PARAM,
    rejected,
    snapshot,
    stringArg,
    toJsonSchema,
    ToolArgs,
    ToolContext,
    validateBody,
} from '../toolKit'

const memberParams = {
    memberId: { type: 'string' },
    expectedMemberName: expectedParam("member's `name`", 'listTeam'),
}

const resolveMember = async ({ firebaseApp, eventId }: ToolContext, args: ToolArgs) => {
    const memberId = stringArg(args, 'memberId')
    if (!memberId) return { error: 'memberId is required' }
    const { team } = await TeamDao.getTeams(firebaseApp, eventId)
    const member = team.find((item) => item.id === memberId)
    if (!member) return { error: `Team member not found: ${memberId}` }
    const mismatch = expectedMismatch({
        arg: 'expectedMemberName',
        value: args?.expectedMemberName,
        actual: member.name,
        entity: 'team member',
        id: memberId,
        listTool: 'listTeam',
    })
    return mismatch ? { error: mismatch } : { member, memberId }
}

const label = (member: TeamMember) => (member.role ? `${member.name} (${member.role})` : member.name)

export const TEAM_TOOLS: ChatTool[] = [
    {
        type: 'read',
        name: 'listTeam',
        capabilities: ['team.list'],
        description:
            'List the organizing team members (id, name, role, team, bio, photoUrl, socials, order, teamOrder). Ids are slugified names such as "ada-lovelace"; `team` groups members.',
        parameters: objectSchema({}),
        run: async ({ firebaseApp, eventId }) => (await TeamDao.getTeams(firebaseApp, eventId)).team,
    },
    {
        type: 'proposal',
        name: 'proposeAddTeamMember',
        kind: 'addTeamMember',
        capabilities: ['team.add'],
        description:
            'Propose adding a team member (same body as POST /team). name is required; the id defaults to the slugified name and the call is rejected when that id already exists. team defaults to "default". Does NOT apply: emits a proposal for user review.',
        parameters: objectSchema({ member: toJsonSchema(TypeBoxCreateTeamMember), rationale: RATIONALE_PARAM }, [
            'member',
        ]),
        build: async ({ firebaseApp, eventId }, args) => {
            const body = pickSchemaFields(args?.member, TypeBoxCreateTeamMember)
            const invalid = validateBody(TypeBoxCreateTeamMember, body)
            if (invalid) return rejected(invalid)
            const member = toTeamMember(body as CreateTeamMemberType)
            if (!member.id) return rejected('The name yields an empty id, pass an explicit id')
            const { team } = await TeamDao.getTeams(firebaseApp, eventId)
            if (team.some((item) => item.id === member.id)) {
                return rejected(`Team member already exists: ${member.id}. Use proposeUpdateTeamMember instead.`)
            }
            const { id, ...stored } = member
            return proposed('addTeamMember', args, {
                summary: `Add ${label(member)} to the team`,
                endpoint: endpointFor('team.add', { eventId }, { ...body, id }),
                target: { id, label: member.name },
                diff: { before: {}, after: stored },
            })
        },
    },
    {
        type: 'proposal',
        name: 'proposeUpdateTeamMember',
        kind: 'updateTeamMember',
        capabilities: ['team.update'],
        description:
            'Propose a partial update to a team member (name, role, team, bio, photoUrl, socials, order, teamOrder; the id cannot change). Does NOT apply: emits a proposal for user review. Pass expectedMemberName = the name from listTeam.',
        parameters: objectSchema(
            { ...memberParams, patch: toJsonSchema(TypeBoxPatchTeamMember), rationale: RATIONALE_PARAM },
            ['memberId', 'expectedMemberName', 'patch']
        ),
        build: async (ctx, args) => {
            const patch = pickSchemaFields(args?.patch, TypeBoxPatchTeamMember)
            if (Object.keys(patch).length === 0) return rejected('patch must contain at least one allowed field')
            const invalid = validateBody(TypeBoxPatchTeamMember, patch)
            if (invalid) return rejected(invalid)
            const resolved = await resolveMember(ctx, args)
            if (resolved.error !== undefined) return rejected(resolved.error)
            const { member, memberId } = resolved
            return proposed('updateTeamMember', args, {
                summary: `Update team member ${member.name}`,
                endpoint: endpointFor('team.update', { eventId: ctx.eventId, memberId }, patch),
                target: { id: memberId, label: member.name },
                diff: { before: snapshot(member, Object.keys(patch)), after: patch },
            })
        },
    },
    {
        type: 'proposal',
        name: 'proposeDeleteTeamMember',
        kind: 'deleteTeamMember',
        capabilities: ['team.delete'],
        description:
            'Propose removing a member from the organizing team (irreversible). Does NOT apply: the user confirms. Pass expectedMemberName = the name from listTeam.',
        parameters: objectSchema({ ...memberParams, rationale: RATIONALE_PARAM }, ['memberId', 'expectedMemberName']),
        build: async (ctx, args) => {
            const resolved = await resolveMember(ctx, args)
            if (resolved.error !== undefined) return rejected(resolved.error)
            const { member, memberId } = resolved
            return proposed('deleteTeamMember', args, {
                summary: `Remove ${label(member)} from the team${IRREVERSIBLE}`,
                endpoint: endpointFor('team.delete', { eventId: ctx.eventId, memberId }),
                target: { id: memberId, label: member.name },
                diff: { before: { ...member }, after: null },
            })
        },
    },
]
