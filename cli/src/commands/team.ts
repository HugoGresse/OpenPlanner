import { Command } from 'commander'
import { call, DataOptions, dataOptions, deleteCommand, run, segment } from '../context.js'
import { buildBody } from '../input.js'

export const registerTeam = (program: Command): void => {
    const team = program.command('team').description('Organizing team members')

    team.command('list')
        .description('Team members, flat (`team`) and grouped by team (`teams`)')
        .action(call('GET', '/v1/{eventId}/team'))

    dataOptions(team.command('add'))
        .description(
            'Add a member: name required; role, team (default "default"), bio, photoUrl, order, teamOrder, socials. Id defaults to the slugified name'
        )
        .action(
            run<DataOptions>((ctx, options) =>
                ctx.client.request({ method: 'POST', path: '/v1/{eventId}/team', body: buildBody(options) })
            )
        )

    dataOptions(team.command('update <memberId>'))
        .description(
            'Partial update: name, role, team, bio, photoUrl, order, teamOrder, socials (unknown fields rejected)'
        )
        .action(
            run<DataOptions>((ctx, options, memberId) =>
                ctx.client.request({
                    method: 'PATCH',
                    path: `/v1/{eventId}/team/${segment(memberId)}`,
                    body: buildBody(options),
                })
            )
        )

    deleteCommand(
        team.command('delete <memberId>').description('Delete a team member (irreversible)'),
        (memberId) => `/v1/{eventId}/team/${memberId}`
    )
}
