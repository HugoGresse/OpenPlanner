import { chunk, goMessage, OPTIONS_PER_POLL, POLL_QUESTION, TrackSession, TrackState } from './trackSession'

// Side effects are injected so the flow is unit-testable without Firebase or the network.
export type WhatsappSenders = {
    sendPoll: (chatId: string, question: string, options: string[]) => Promise<string>
    sendMessage: (chatId: string, message: string) => Promise<string>
}

// Start a track-management session: send one poll per group of up to 12 tracks.
export const startTrackSession = async (
    tracks: { id: string; name: string }[],
    chatId: string,
    senders: WhatsappSenders
): Promise<TrackSession> => {
    const trackStates: TrackState[] = tracks.map((t) => ({ id: t.id, name: t.name, ready: false }))
    const pollMessageIds: string[] = []

    for (const group of chunk(trackStates, OPTIONS_PER_POLL)) {
        const idMessage = await senders.sendPoll(
            chatId,
            POLL_QUESTION,
            group.map((t) => t.name)
        )
        pollMessageIds.push(idMessage)
    }

    return { chatId, tracks: trackStates, pollMessageIds, goSent: false, panelsSent: [] }
}

// Apply a poll vote update: tracks whose option got at least one vote become ready (sticky — a track
// stays ready even if a voter later removes their vote). The GO message is no longer sent
// automatically — see sendGoMessage, triggered manually from the admin UI.
export const applyPollVotes = (session: TrackSession, votedOptionNames: string[]): TrackSession => {
    const voted = new Set(votedOptionNames)

    for (const track of session.tracks) {
        if (!track.ready && voted.has(track.name)) {
            track.ready = true
        }
    }

    return session
}

// Manually broadcast the GO message. Caller is responsible for checking allReady(session.tracks)
// and !session.goSent first (the admin route does, guarding against early/duplicate sends).
export const sendGoMessage = async (session: TrackSession, senders: WhatsappSenders): Promise<TrackSession> => {
    await senders.sendMessage(session.chatId, goMessage(session.tracks))
    session.goSent = true
    return session
}
