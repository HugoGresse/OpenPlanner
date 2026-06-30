import { describe, expect, test, vi } from 'vitest'
import { applyPollVotes, sendGoMessage, startTrackSession, WhatsappSenders } from './trackFlow'

const makeSenders = () => {
    let n = 0
    const sendPoll = vi.fn(async () => `poll-${++n}`)
    const sendMessage = vi.fn(async () => `txt-${++n}`)
    const senders: WhatsappSenders = { sendPoll, sendMessage }
    return { senders, sendPoll, sendMessage }
}

const tracks = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: `Track ${i + 1}` }))

describe('startTrackSession', () => {
    test('sends one poll for up to 12 tracks', async () => {
        const { senders, sendPoll } = makeSenders()
        const session = await startTrackSession(tracks(5), '123@c.us', senders)

        expect(sendPoll).toHaveBeenCalledTimes(1)
        expect(sendPoll.mock.calls[0][2]).toEqual(['Track 1', 'Track 2', 'Track 3', 'Track 4', 'Track 5'])
        expect(session.pollMessageIds).toEqual(['poll-1'])
        expect(session.tracks.every((t) => !t.ready)).toBe(true)
        expect(session.goSent).toBe(false)
    })

    test('splits into multiple polls beyond 12 options', async () => {
        const { senders, sendPoll } = makeSenders()
        const session = await startTrackSession(tracks(13), 'c@c.us', senders)
        expect(sendPoll).toHaveBeenCalledTimes(2) // 13 -> [12, 1]
        expect(session.pollMessageIds).toHaveLength(2)
    })
})

describe('applyPollVotes', () => {
    test('marks voted tracks ready (matched by option name)', async () => {
        const { senders } = makeSenders()
        const session = await startTrackSession(tracks(3), 'c@c.us', senders)

        applyPollVotes(session, [
            { name: 'Track 1', ready: true },
            { name: 'Track 2', ready: false },
            { name: 'Track 3', ready: false },
        ])

        expect(session.tracks.find((t) => t.id === 't1')!.ready).toBe(true)
        expect(session.tracks.find((t) => t.id === 't2')!.ready).toBe(false)
    })

    test('cancelling a vote un-readies the track and never sends GO on its own', async () => {
        const { senders, sendMessage } = makeSenders()
        const session = await startTrackSession(tracks(2), 'c@c.us', senders)

        applyPollVotes(session, [
            { name: 'Track 1', ready: true },
            { name: 'Track 2', ready: false },
        ])
        expect(session.tracks.find((t) => t.id === 't1')!.ready).toBe(true)

        // The voter removes their vote: the same poll now reports Track 1 with no voters.
        applyPollVotes(session, [
            { name: 'Track 1', ready: false },
            { name: 'Track 2', ready: false },
        ])
        expect(session.tracks.find((t) => t.id === 't1')!.ready).toBe(false)
        expect(sendMessage).not.toHaveBeenCalled()
        expect(session.goSent).toBe(false)
    })

    test('only updates tracks that are options in this poll (multi-poll split)', async () => {
        const { senders } = makeSenders()
        const session = await startTrackSession(tracks(2), 'c@c.us', senders)

        // Each track voted ready via its own poll message.
        applyPollVotes(session, [{ name: 'Track 1', ready: true }])
        applyPollVotes(session, [{ name: 'Track 2', ready: true }])
        expect(session.tracks.every((t) => t.ready)).toBe(true)

        // An update for the first poll must not touch Track 2 (a different poll message).
        applyPollVotes(session, [{ name: 'Track 1', ready: false }])
        expect(session.tracks.find((t) => t.id === 't1')!.ready).toBe(false)
        expect(session.tracks.find((t) => t.id === 't2')!.ready).toBe(true)
    })
})

describe('sendGoMessage', () => {
    test('sends the GO message and flags the session as sent', async () => {
        const { senders, sendMessage } = makeSenders()
        const session = await startTrackSession(tracks(2), 'c@c.us', senders)
        applyPollVotes(session, [
            { name: 'Track 1', ready: true },
            { name: 'Track 2', ready: true },
        ])

        const updated = await sendGoMessage(session, senders)

        expect(sendMessage).toHaveBeenCalledTimes(1)
        expect(sendMessage).toHaveBeenCalledWith('c@c.us', expect.stringContaining('GO'))
        expect(updated.goSent).toBe(true)
    })
})
