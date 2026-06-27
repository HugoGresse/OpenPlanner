import { InteractiveButton } from './greenApi'
import {
    allReady,
    BUTTONS_PER_MESSAGE,
    buttonsForTracks,
    ButtonMessage,
    chunk,
    goMessage,
    pendingBody,
    recapBody,
    TrackSession,
    TrackState,
} from './trackSession'

// Side effects are injected so the flow is unit-testable without Firebase or the network.
export type WhatsappSenders = {
    sendInteractiveButtons: (chatId: string, body: string, buttons: InteractiveButton[]) => Promise<string>
    editMessage: (chatId: string, idMessage: string, message: string) => Promise<void>
    sendMessage: (chatId: string, message: string) => Promise<string>
}

// Start a track-management session: send one interactive message per group of <=3 tracks.
export const startTrackSession = async (
    tracks: { id: string; name: string }[],
    chatId: string,
    senders: WhatsappSenders
): Promise<TrackSession> => {
    const trackStates: TrackState[] = tracks.map((t) => ({ id: t.id, name: t.name, ready: false }))
    const messages: ButtonMessage[] = []

    for (const group of chunk(trackStates, BUTTONS_PER_MESSAGE)) {
        const idMessage = await senders.sendInteractiveButtons(chatId, pendingBody(group), buttonsForTracks(group))
        messages.push({ idMessage, trackIds: group.map((t) => t.id) })
    }

    return { chatId, tracks: trackStates, messages, goSent: false }
}

// Handle one track confirming ready: mark it, update its (now button-less) message, re-offer buttons for
// the tracks still pending in that group, and send GO once every track is ready.
export const handleTrackReady = async (
    session: TrackSession,
    pressedTrackId: string,
    senders: WhatsappSenders
): Promise<TrackSession> => {
    const track = session.tracks.find((t) => t.id === pressedTrackId)
    if (!track || track.ready) {
        return session
    }
    track.ready = true

    const byId = (id: string) => session.tracks.find((t) => t.id === id)!
    const message = session.messages.find((m) => m.trackIds.includes(pressedTrackId))

    if (message) {
        const groupTracks = message.trackIds.map(byId)
        await senders.editMessage(session.chatId, message.idMessage, recapBody(groupTracks))
        session.messages = session.messages.filter((m) => m !== message)

        const stillPending = groupTracks.filter((t) => !t.ready)
        if (stillPending.length > 0) {
            const idMessage = await senders.sendInteractiveButtons(
                session.chatId,
                pendingBody(stillPending),
                buttonsForTracks(stillPending)
            )
            session.messages.push({ idMessage, trackIds: stillPending.map((t) => t.id) })
        }
    }

    if (!session.goSent && allReady(session.tracks)) {
        await senders.sendMessage(session.chatId, goMessage(session.tracks))
        session.goSent = true
    }

    return session
}
