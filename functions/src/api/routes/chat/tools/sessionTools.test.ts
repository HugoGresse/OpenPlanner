import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EventDao } from '../../../dao/eventDao'
import { SessionDao } from '../../../dao/sessionDao'
import { SpeakerDao } from '../../../dao/speakerDao'
import { expectProposal, expectRejected, propose, UUID } from '../../../testUtils/chatTools'

const event = { id: 'evt', name: 'DevFest', tracks: [{ id: 't1', name: 'Main' }], formats: [], categories: [] }
const session = { title: 'Keynote', speakers: ['sp1'], trackId: 't1', note: 'private' }

describe('session tools', () => {
    beforeEach(() => {
        vi.spyOn(EventDao, 'getEvent').mockResolvedValue(event as never)
        vi.spyOn(SessionDao, 'doesSessionExist').mockResolvedValue(session as never)
        vi.spyOn(SpeakerDao, 'findMissingSpeakerIds').mockImplementation(async (_app, _event, ids) =>
            ids.filter((id) => id !== 'sp1')
        )
    })
    afterEach(() => vi.restoreAllMocks())

    test('proposeCreateSession generates the id, posts the route body and validates like the route', async () => {
        const proposal = expectProposal(
            await propose('proposeCreateSession', {
                session: {
                    title: 'Rust 101',
                    trackId: 't1',
                    speakers: ['sp1'],
                    dates: { start: '2026-06-01T09:00:00Z', end: '2026-06-01T09:45:00Z' },
                },
            })
        )
        expect(proposal.kind).toBe('createSession')
        expect(proposal.summary).toBe('Create session Rust 101')
        expect(proposal.endpoint.method).toBe('POST')
        expect(proposal.endpoint.path).toBe('/v1/evt/sessions')
        expect(proposal.endpoint.body?.id).toMatch(UUID)
        expect(proposal.target.id).toBe(proposal.endpoint.body?.id)
        expect(proposal.diff).toEqual({
            before: {},
            after: {
                title: 'Rust 101',
                trackId: 't1',
                speakers: ['sp1'],
                dates: { start: '2026-06-01T09:00:00Z', end: '2026-06-01T09:45:00Z' },
            },
        })
    })

    test('proposeCreateSession rejects what POST /sessions would reject', async () => {
        const reject = async (body: object, message: string | RegExp) =>
            expectRejected(await propose('proposeCreateSession', { session: body }), message)
        await reject({ title: 'x', trackId: 'nope' }, 'Unknown trackId "nope". Valid ids: t1')
        await reject({ title: 'x', speakers: ['ghost'] }, 'Unknown speaker id(s): ghost')
        await reject({ title: 'x', dates: { start: '2026-06-01T09:00:00Z' } }, /given together/)
        await reject({ title: 'x', dates: { start: 'tomorrow', end: 'later' } }, /must be ISO 8601 with a UTC offset/)
        await reject(
            { title: 'x', dates: { start: '2026-06-01T09:00:00', end: '2026-06-01T09:30:00' } },
            'dates.start must be ISO 8601 with a UTC offset (e.g. 2026-06-12T14:00:00+02:00), got "2026-06-01T09:00:00"'
        )
        await reject({ title: 'x', speaker: ['sp1'] }, /Unknown field\(s\) "speaker"\. Allowed: .*speakers/)
        await reject({ title: ' ' }, 'title must not be blank')
        await reject({ title: 'x', durationMinutes: '45' }, /durationMinutes must be number/)
    })

    test('proposePatchSession checks references the PATCH route would accept blindly', async () => {
        expectRejected(
            await propose('proposePatchSession', {
                sessionId: 's1',
                expectedSessionTitle: 'Keynote',
                patch: { trackId: 'nope' },
            }),
            /Unknown trackId "nope"/
        )
        const proposal = expectProposal(
            await propose('proposePatchSession', {
                sessionId: 's1',
                expectedSessionTitle: 'keynote',
                patch: { note: 'moved', dates: { start: '2026-06-01T10:00:00Z', end: '2026-06-01T10:30:00Z' } },
            })
        )
        expect(proposal.endpoint).toMatchObject({ method: 'PATCH', path: '/v1/evt/sessions/s1' })
        expect(proposal.diff.before).toEqual({ note: 'private', dates: null })
    })

    test('proposeDeleteSession is an irreversible DELETE guarded by the title', async () => {
        const proposal = expectProposal(
            await propose('proposeDeleteSession', { sessionId: 's/1', expectedSessionTitle: 'Keynote' })
        )
        expect(proposal).toMatchObject({
            kind: 'deleteSession',
            summary: 'Delete session Keynote',
            endpoint: { method: 'DELETE', path: '/v1/evt/sessions/s%2F1' },
            diff: { before: { id: 's/1', title: 'Keynote', speakers: ['sp1'] }, after: null },
        })
        expect(proposal.diff.before).not.toHaveProperty('note')
        expectRejected(
            await propose('proposeDeleteSession', { sessionId: 's1', expectedSessionTitle: 'Other talk' }),
            /does not match the session document at s1/
        )
        vi.mocked(SessionDao.doesSessionExist).mockResolvedValue(false)
        expectRejected(
            await propose('proposeDeleteSession', { sessionId: 's1', expectedSessionTitle: 'Keynote' }),
            'Session not found: s1'
        )
    })
})
