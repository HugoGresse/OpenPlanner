import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EventDao } from '../../../dao/eventDao'
import { SpeakerDao } from '../../../dao/speakerDao'
import { SpeakerPendingEditDao } from '../../../dao/speakerPendingEditDao'
import { expectProposal, expectRejected, propose, read, UUID } from '../../../testUtils/chatTools'

const alice = { id: 'sp1', name: 'Alice', company: 'ACME', email: 'a@x', socials: [] }
const pendingEdit = {
    id: 'req1',
    speakerId: 'sp1',
    status: 'pending',
    tokenId: 'secret-token',
    ip: '1.2.3.4',
    patch: { company: 'Initech' },
}

describe('speaker and pending edit tools', () => {
    beforeEach(() => {
        vi.spyOn(SpeakerDao, 'getSpeakers').mockResolvedValue([alice] as never)
        vi.spyOn(SpeakerDao, 'doesSpeakerExist').mockResolvedValue(alice as never)
        vi.spyOn(SpeakerPendingEditDao, 'list').mockResolvedValue([pendingEdit] as never)
        vi.spyOn(SpeakerPendingEditDao, 'get').mockResolvedValue(pendingEdit as never)
    })
    afterEach(() => vi.restoreAllMocks())

    test('proposeCreateSpeaker posts a generated id and rejects unknown fields and blank names', async () => {
        const proposal = expectProposal(
            await propose('proposeCreateSpeaker', { speaker: { name: 'Bob', company: 'Globex' } })
        )
        expect(proposal.endpoint).toMatchObject({
            method: 'POST',
            path: '/v1/evt/speakers',
            body: { name: 'Bob', company: 'Globex' },
        })
        expect(proposal.endpoint.body?.id).toMatch(UUID)
        expectRejected(await propose('proposeCreateSpeaker', { speaker: { name: '  ' } }), 'name must not be blank')
        expectRejected(
            await propose('proposeCreateSpeaker', { speaker: { name: 'Bob', photoUrl: 'nope' } }),
            /photoUrl must match format "uri"/
        )
    })

    test('proposeDeleteSpeaker keeps private fields out of the snapshot', async () => {
        const proposal = expectProposal(
            await propose('proposeDeleteSpeaker', { speakerId: 'sp1', expectedSpeakerName: 'Alice' })
        )
        expect(proposal.summary).toBe('Delete speaker Alice (cannot be undone)')
        expect(proposal.diff.before).toMatchObject({ id: 'sp1', name: 'Alice', company: 'ACME' })
        expect(proposal.diff.before).not.toHaveProperty('email')
    })

    test('listPendingEdits adds the speaker name and hides the token and IP', async () => {
        const [item] = (await read('listPendingEdits')) as Array<Record<string, unknown>>
        expect(item).toMatchObject({ id: 'req1', speakerName: 'Alice', patch: { company: 'Initech' } })
        expect(item).not.toHaveProperty('tokenId')
        expect(item).not.toHaveProperty('ip')
    })

    test('approve / reject proposals call the review routes with a JSON body', async () => {
        const approve = expectProposal(
            await propose('proposeApprovePendingEdit', { requestId: 'req1', expectedSpeakerName: 'Alice' })
        )
        expect(approve).toMatchObject({
            kind: 'approvePendingEdit',
            endpoint: { method: 'POST', path: '/v1/evt/speaker-pending-edits/req1/approve', body: {} },
            diff: { before: { company: 'ACME' }, after: { company: 'Initech' } },
        })
        const reject = expectProposal(
            await propose('proposeRejectPendingEdit', {
                requestId: 'req1',
                expectedSpeakerName: 'Alice',
                reviewNote: 'Use the legal name',
            })
        )
        expect(reject.endpoint).toEqual({
            method: 'POST',
            path: '/v1/evt/speaker-pending-edits/req1/reject',
            body: { reviewNote: 'Use the legal name' },
        })
    })

    test('approve / reject refuse closed requests and wrong speakers', async () => {
        expectRejected(
            await propose('proposeApprovePendingEdit', { requestId: 'req1', expectedSpeakerName: 'Bob' }),
            /Re-run listPendingEdits/
        )
        vi.mocked(SpeakerPendingEditDao.get).mockResolvedValue({ ...pendingEdit, status: 'approved' } as never)
        expectRejected(
            await propose('proposeRejectPendingEdit', { requestId: 'req1', expectedSpeakerName: 'Alice' }),
            'Pending edit req1 is already approved'
        )
    })
})

describe('event tools', () => {
    beforeEach(() => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue({
            id: 'evt',
            name: 'DevFest',
            apiKey: 'secret',
            openRouterApiKey: 'secret',
            scheduleVisible: false,
        } as never)
    })
    afterEach(() => vi.restoreAllMocks())

    test('getEvent is the GET /event/details DTO, without secrets', async () => {
        const event = (await read('getEvent')) as Record<string, unknown>
        expect(event).toMatchObject({ id: 'evt', name: 'DevFest', tracks: [], scheduleVisible: false })
        expect(JSON.stringify(event)).not.toContain('secret')
    })

    test('proposePatchEvent validates against the PATCH /event schema', async () => {
        expectRejected(
            await propose('proposePatchEvent', { patch: { scheduleVisible: 'yes' } }),
            /scheduleVisible must be boolean/
        )
        const proposal = expectProposal(await propose('proposePatchEvent', { patch: { scheduleVisible: true } }))
        expect(proposal.diff).toEqual({ before: { scheduleVisible: false }, after: { scheduleVisible: true } })
    })

    test('proposeDeployEvent posts an empty JSON body to /deploy', async () => {
        const proposal = expectProposal(await propose('proposeDeployEvent', {}))
        expect(proposal).toMatchObject({
            kind: 'deployEvent',
            summary: 'Update the website of DevFest',
            endpoint: { method: 'POST', path: '/v1/evt/deploy', body: {} },
        })
    })
})
