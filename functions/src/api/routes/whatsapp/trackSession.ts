export type TrackState = {
    id: string
    name: string
    ready: boolean
}

export type TrackSession = {
    chatId: string
    tracks: TrackState[]
    // Poll message ids we sent (for reference; votes are matched back by option name).
    pollMessageIds: string[]
    goSent: boolean
}

// WhatsApp polls allow at most 12 options; split tracks across polls if there are more.
export const OPTIONS_PER_POLL = 12

export const POLL_QUESTION = 'Which tracks are ready? Tap your track.'

export const chunk = <T>(items: T[], size: number): T[][] => {
    const out: T[][] = []
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size))
    }
    return out
}

export const allReady = (tracks: TrackState[]): boolean => tracks.length > 0 && tracks.every((t) => t.ready)

export const goMessage = (tracks: TrackState[]): string =>
    `🟢 GO — all ${tracks.length} tracks are ready. You can start.`
