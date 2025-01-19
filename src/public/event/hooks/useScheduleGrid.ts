import { DateTime } from 'luxon'
import { useMemo } from 'react'
import { JsonSession, JsonSpeaker } from '../../../events/actions/updateWebsiteActions/jsonTypes'
import { Category, Track } from '../../../types'

export const GRID_CONFIG = {
    TIME_COLUMN_WIDTH: '60px',
    TRACK_MIN_WIDTH: '200px',
} as const

export type SessionWithSpeakers = JsonSession & {
    speakersData: JsonSpeaker[]
}

export function useScheduleGrid(sessions: JsonSession[], tracks: Track[], speakersData: JsonSpeaker[]) {
    return useMemo(() => {
        // Combine sessions with their speakers data
        const sessionsWithSpeakers = sessions.map((session) => ({
            ...session,
            speakersData: speakersData.filter((speaker) => session.speakerIds.includes(speaker.id)),
        }))

        // Get unique time slots
        const uniqueTimeSlots = Array.from(
            new Set(sessions.map((session) => DateTime.fromISO(session.dateStart!).toFormat('HH:mm')))
        )
            .sort()
            .map((time) => DateTime.fromFormat(time, 'HH:mm'))

        // Calculate time slots and start time
        const timeSlots = sessions
            .filter((session) => session.dateStart && session.trackId === tracks[0]?.id)
            .map((session) => DateTime.fromISO(session.dateStart!))
            .sort((a, b) => a.toMillis() - b.toMillis())

        const startTime = timeSlots[0]

        return {
            sessionsWithSpeakers,
            uniqueTimeSlots,
            timeSlots,
            startTime,
            gridTemplateColumns: `${GRID_CONFIG.TIME_COLUMN_WIDTH} repeat(${tracks.length}, minmax(${GRID_CONFIG.TRACK_MIN_WIDTH}, 1fr))`,
        }
    }, [sessions, tracks, speakersData])
}
