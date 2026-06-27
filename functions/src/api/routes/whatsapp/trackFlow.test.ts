import { describe, expect, test, vi } from 'vitest'
import { handleTrackReady, startTrackSession, WhatsappSenders } from './trackFlow'

// Fake senders: record calls, hand back incrementing message ids.
const makeSenders = () => {
    let n = 0
    const sendInteractiveButtons = vi.fn(async () => `msg-${++n}`)
    const editMessage = vi.fn(async () => {})
    const sendMessage = vi.fn(async () => `txt-${++n}`)
    const senders: WhatsappSenders = { sendInteractiveButtons, editMessage, sendMessage }
    return { senders, sendInteractiveButtons, editMessage, sendMessage }
}

const tracks = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: `Track ${i + 1}` }))

describe('startTrackSession', () => {
    test('chunks tracks into messages of at most 3 buttons', async () => {
        const { senders, sendInteractiveButtons } = makeSenders()
        const session = await startTrackSession(tracks(5), '123@c.us', senders)

        expect(sendInteractiveButtons).toHaveBeenCalledTimes(2) // 5 tracks -> [3, 2]
        expect(session.messages.map((m) => m.trackIds)).toEqual([
            ['t1', 't2', 't3'],
            ['t4', 't5'],
        ])
        expect(session.tracks.every((t) => !t.ready)).toBe(true)
        expect(session.goSent).toBe(false)

        const firstButtons = sendInteractiveButtons.mock.calls[0][2]
        expect(firstButtons).toHaveLength(3)
        expect(firstButtons[0]).toMatchObject({ buttonId: 't1', buttonText: 'Track 1' })
    })
})

describe('handleTrackReady', () => {
    test('marks the track ready, edits its message and re-offers the still-pending buttons', async () => {
        const { senders, editMessage, sendInteractiveButtons } = makeSenders()
        const session = await startTrackSession(tracks(3), 'c@c.us', senders)
        sendInteractiveButtons.mockClear()

        await handleTrackReady(session, 't1', senders)

        expect(session.tracks.find((t) => t.id === 't1')!.ready).toBe(true)
        expect(editMessage).toHaveBeenCalledTimes(1) // original 3-button message edited to a recap
        // remaining pending (t2, t3) get a fresh 2-button message
        expect(sendInteractiveButtons).toHaveBeenCalledTimes(1)
        expect(sendInteractiveButtons.mock.calls[0][2].map((b: any) => b.buttonId)).toEqual(['t2', 't3'])
        expect(session.messages).toEqual([{ idMessage: expect.any(String), trackIds: ['t2', 't3'] }])
    })

    test('sends GO exactly once when the last track becomes ready', async () => {
        const { senders, sendMessage } = makeSenders()
        const session = await startTrackSession(tracks(2), 'c@c.us', senders)

        await handleTrackReady(session, 't1', senders)
        expect(sendMessage).not.toHaveBeenCalled()
        expect(session.goSent).toBe(false)

        await handleTrackReady(session, 't2', senders)
        expect(sendMessage).toHaveBeenCalledTimes(1)
        expect(session.goSent).toBe(true)
        expect(session.messages).toHaveLength(0)
    })

    test('is idempotent for a track that is already ready', async () => {
        const { senders, editMessage } = makeSenders()
        const session = await startTrackSession(tracks(2), 'c@c.us', senders)

        await handleTrackReady(session, 't1', senders)
        editMessage.mockClear()
        await handleTrackReady(session, 't1', senders) // duplicate press

        expect(editMessage).not.toHaveBeenCalled()
    })
})
