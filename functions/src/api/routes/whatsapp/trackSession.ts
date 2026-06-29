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

// Timing reminders auto-scheduled when GO is sent, on a 50min session clock: 15/10/5 min left, then end.
export const PANEL_SCHEDULE: { delaySeconds: number; message: string }[] = [
    { delaySeconds: 35 * 60, message: 'Panneau 15 min' },
    { delaySeconds: 40 * 60, message: 'Panneau 10 min' },
    { delaySeconds: 45 * 60, message: 'Panneau 5 min' },
    { delaySeconds: 50 * 60, message: 'Fin de session' },
]
