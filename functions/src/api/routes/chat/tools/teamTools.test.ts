import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { TeamDao } from '../../../dao/teamDao'
import { expectProposal, expectRejected, propose, read } from '../../../testUtils/chatTools'

const ada = { id: 'ada', name: 'Ada', role: 'Organizer', team: 'core', bio: null, photoUrl: null, socials: [] }

describe('team tools', () => {
    beforeEach(() => {
        vi.spyOn(TeamDao, 'getTeams').mockResolvedValue({ team: [ada], teams: [] } as never)
        vi.spyOn(TeamDao, 'getMember').mockImplementation(async (_app, _event, id) => (id === 'ada' ? ada : null))
    })
    afterEach(() => vi.restoreAllMocks())

    test('listTeam returns a lean projection unless fields[] asks for more', async () => {
        expect(await read('listTeam')).toEqual([{ id: 'ada', name: 'Ada', role: 'Organizer', team: 'core' }])
        expect(await read('listTeam', { fields: ['bio'] })).toEqual([{ id: 'ada', bio: null }])
    })

    test('proposeAddTeamMember posts the route body with the slugified id and shows the stored member', async () => {
        const proposal = expectProposal(
            await propose('proposeAddTeamMember', {
                member: { name: 'Grace Hopper', role: 'Speaker manager' },
                rationale: ' new volunteer ',
            })
        )
        expect(proposal).toMatchObject({
            kind: 'addTeamMember',
            summary: 'Add Grace Hopper (Speaker manager) to the team',
            rationale: 'new volunteer',
            endpoint: {
                method: 'POST',
                path: '/v1/evt/team',
                body: { name: 'Grace Hopper', role: 'Speaker manager', id: 'grace-hopper' },
            },
            target: { id: 'grace-hopper', label: 'Grace Hopper' },
            diff: { before: {}, after: { name: 'Grace Hopper', team: 'default', socials: [] } },
        })
    })

    test('proposeAddTeamMember rejects an existing id, a missing name and a bad URL', async () => {
        expectRejected(await propose('proposeAddTeamMember', { member: { name: 'Ada' } }), /already exists: ada/)
        expectRejected(await propose('proposeAddTeamMember', { member: { role: 'x' } }), /must have required/)
        expectRejected(
            await propose('proposeAddTeamMember', { member: { name: 'Bob', nickname: 'b' } }),
            /Unknown field\(s\) "nickname"/
        )
        expectRejected(
            await propose('proposeAddTeamMember', { member: { name: 'Bob', photoUrl: 'not a url' } }),
            /photoUrl/
        )
    })

    test('proposeUpdateTeamMember patches only the given fields after the name check', async () => {
        const proposal = expectProposal(
            await propose('proposeUpdateTeamMember', {
                memberId: 'ada',
                expectedMemberName: ' ada ',
                patch: { role: 'Lead' },
            })
        )
        expect(proposal.endpoint).toEqual({ method: 'PATCH', path: '/v1/evt/team/ada', body: { role: 'Lead' } })
        expect(proposal.diff).toEqual({ before: { role: 'Organizer' }, after: { role: 'Lead' } })

        expectRejected(
            await propose('proposeUpdateTeamMember', {
                memberId: 'ada',
                expectedMemberName: 'Grace',
                patch: { role: 'x' },
            }),
            /expectedMemberName \("Grace"\) does not match the team member document at ada.*Re-run listTeam/
        )
        expectRejected(
            await propose('proposeUpdateTeamMember', { memberId: 'ada', expectedMemberName: 'Ada', patch: {} }),
            'patch must contain at least one field'
        )
        expectRejected(
            await propose('proposeUpdateTeamMember', {
                memberId: 'ada',
                expectedMemberName: 'Ada',
                patch: { id: 'grace' },
            }),
            /Unknown field\(s\) "id"/
        )
        expectRejected(
            await propose('proposeUpdateTeamMember', {
                memberId: 'nope',
                expectedMemberName: 'Ada',
                patch: { role: 'x' },
            }),
            'Team member not found: nope'
        )
    })

    test('proposeDeleteTeamMember is a DELETE flagged as irreversible', async () => {
        const proposal = expectProposal(
            await propose('proposeDeleteTeamMember', { memberId: 'ada', expectedMemberName: 'Ada' })
        )
        expect(proposal).toMatchObject({
            kind: 'deleteTeamMember',
            summary: 'Remove Ada (Organizer) from the team',
            endpoint: { method: 'DELETE', path: '/v1/evt/team/ada' },
            diff: { before: ada, after: null },
        })
        expectRejected(await propose('proposeDeleteTeamMember', { memberId: 'ada' }), /expectedMemberName is required/)
    })
})
