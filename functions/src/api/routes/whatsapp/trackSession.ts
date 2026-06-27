import { InteractiveButton } from './greenApi'

export type TrackState = {
    id: string
    name: string
    ready: boolean
}

// An active interactive-buttons message and which tracks (still pending) it offers buttons for.
export type ButtonMessage = {
    idMessage: string
    trackIds: string[]
}

export type TrackSession = {
    chatId: string
    tracks: TrackState[]
    messages: ButtonMessage[]
    goSent: boolean
}

export const BUTTONS_PER_MESSAGE = 3

export const chunk = <T>(items: T[], size: number): T[][] => {
    const out: T[][] = []
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size))
    }
    return out
}

export const buttonsForTracks = (tracks: TrackState[]): InteractiveButton[] =>
    tracks.map((t) => ({ buttonId: t.id, buttonText: t.name }))

// Body text shown above the buttons on an active (pending) message.
export const pendingBody = (tracks: TrackState[]): string => {
    const names = tracks.map((t) => t.name).join(', ')
    return `Tap your track when it is ready: ${names}`
}

// Recap text an edited message shows once a track in its group has confirmed (buttons are gone).
export const recapBody = (tracks: TrackState[]): string => {
    const lines = tracks.map((t) => `${t.ready ? '✅' : '⏳'} ${t.name}`)
    return ['Track status', ...lines].join('\n')
}

export const allReady = (tracks: TrackState[]): boolean => tracks.length > 0 && tracks.every((t) => t.ready)

export const goMessage = (tracks: TrackState[]): string =>
    `🟢 GO — all ${tracks.length} tracks are ready. You can start.`
