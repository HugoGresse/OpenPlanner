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

// Apply a poll vote snapshot for one poll message. GreenAPI sends the full current vote state, so each
// track that is an option in this poll is set ready iff it currently has at least one voter — meaning
// cancelling a vote un-readies the track. Tracks that aren't options in this poll (when >12 tracks were
// split across several poll messages) are left untouched. GO is never sent automatically — see
// sendGoMessage, triggered manually from the admin UI.
export const applyPollVotes = (
    session: TrackSession,
    optionStates: { name: string; ready: boolean }[]
): TrackSession => {
    const readyByName = new Map(optionStates.map((o) => [o.name, o.ready]))

    for (const track of session.tracks) {
        const ready = readyByName.get(track.name)
        if (ready !== undefined) {
            track.ready = ready
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
