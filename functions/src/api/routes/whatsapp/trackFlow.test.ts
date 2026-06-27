import { describe, expect, test, vi } from 'vitest'
import { applyPollVotes, startTrackSession, WhatsappSenders } from './trackFlow'

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

        await applyPollVotes(session, ['Track 1'], senders)

        expect(session.tracks.find((t) => t.id === 't1')!.ready).toBe(true)
        expect(session.tracks.find((t) => t.id === 't2')!.ready).toBe(false)
    })

    test('readiness is sticky and GO is sent once when all are ready', async () => {
        const { senders, sendMessage } = makeSenders()
        const session = await startTrackSession(tracks(2), 'c@c.us', senders)

        await applyPollVotes(session, ['Track 1'], senders)
        expect(sendMessage).not.toHaveBeenCalled()

        // A later update without Track 1's voter must not un-ready it.
        await applyPollVotes(session, ['Track 2'], senders)
        expect(session.tracks.every((t) => t.ready)).toBe(true)
        expect(sendMessage).toHaveBeenCalledTimes(1)
        expect(session.goSent).toBe(true)

        // Further updates don't resend GO.
        await applyPollVotes(session, ['Track 1', 'Track 2'], senders)
        expect(sendMessage).toHaveBeenCalledTimes(1)
    })
})
