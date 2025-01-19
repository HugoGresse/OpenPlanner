import * as React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { DateTime } from 'luxon'
import { JsonSession, JsonSpeaker } from '../../../events/actions/updateWebsiteActions/jsonTypes'
import { Category } from '../../../types'
import { SessionItem } from './SessionItem'

// Types
type DayScheduleProps = {
    day: string
    sessions: JsonSession[]
    speakersData: JsonSpeaker[]
    categories: Category[]
}

type SessionWithSpeakers = JsonSession & {
    speakersData: JsonSpeaker[]
}

type ScheduleGridProps = {
    sessions: SessionWithSpeakers[]
    tracks: string[]
    timeSlots: DateTime[]
    startTime: DateTime
    categories: Category[]
}

const GRID_CONFIG = {
    MINUTES_PER_SLOT: 30, // Time interval between slots
    TIME_COLUMN_WIDTH: '60px',
    TRACK_MIN_WIDTH: '200px',
} as const

const ScheduleGrid: React.FC<ScheduleGridProps> = ({ sessions, tracks, timeSlots, startTime, categories }) => {
    console.log(timeSlots.map((time) => time.toFormat('HH:mm')))

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: `${GRID_CONFIG.TIME_COLUMN_WIDTH} repeat(${tracks.length}, minmax(${GRID_CONFIG.TRACK_MIN_WIDTH}, 1fr))`,
                gridAutoRows: 'minmax(100px, auto)',
                position: 'relative',
                gap: 1,
                '& > *': { borderLeft: '1px solid rgba(0, 0, 0, 0.06)' },
            }}>
            {/* Empty cell for top-left corner */}
            <Box sx={{ gridColumn: 1, gridRow: 1 }} />

            {/* Track Headers */}
            {tracks.map((trackId, index) => (
                <Typography
                    key={trackId}
                    variant="subtitle1"
                    sx={{
                        textAlign: 'center',
                        fontWeight: 'bold',
                        gridColumn: index + 2,
                        gridRow: 1,
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                    {trackId}
                </Typography>
            ))}

            {/* Time Indicators */}
            {timeSlots.map((time, index) => (
                <Typography
                    key={index}
                    variant="caption"
                    sx={{
                        gridColumn: 1,
                        gridRow: index + 2,
                        textAlign: 'right',
                        pr: 2,
                        pt: 2,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-end',
                        borderRight: '1px solid rgba(0, 0, 0, 0.12)',
                    }}>
                    {time.toFormat('HH:mm')}
                </Typography>
            ))}

            {/* Sessions */}
            {sessions.map((session) => {
                if (!session.dateStart || !session.trackId) return null

                const sessionStart = DateTime.fromISO(session.dateStart)
                const diffInMinutes = sessionStart.diff(startTime, 'minutes').minutes
                const rowStart = Math.round(diffInMinutes / GRID_CONFIG.MINUTES_PER_SLOT) + 2
                const rowSpan = Math.ceil(session.durationMinutes / GRID_CONFIG.MINUTES_PER_SLOT)
                const trackIndex = tracks.indexOf(session.trackId)
                const width = session.extendWidth || 1

                if (rowStart < 2 || trackIndex === -1) return null

                return (
                    <Box
                        key={session.id}
                        sx={{
                            gridColumn: `${trackIndex + 2} / span ${width}`,
                            gridRow: `${rowStart} / span ${rowSpan}`,
                            m: 0.5,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                                zIndex: 1,
                                transform: 'scale(1.02)',
                            },
                        }}>
                        <SessionItem session={session} categories={categories} />
                    </Box>
                )
            })}
        </Box>
    )
}

// Main component
export const DaySchedule: React.FC<DayScheduleProps> = ({ day, sessions, speakersData, categories }) => {
    const tracks = Array.from(
        new Set(
            sessions
                .map((session) => session.trackId)
                .filter((trackId): trackId is string => trackId !== null && trackId !== undefined)
        )
    )

    const timeSlots = sessions
        .filter((session) => session.dateStart && session.trackId === tracks[0])
        .map((session) => DateTime.fromISO(session.dateStart!))
        .sort((a, b) => a.toMillis() - b.toMillis())

    const startTime = timeSlots[0]

    const sessionsWithSpeakers = sessions.map((session) => ({
        ...session,
        speakersData: speakersData.filter((speaker) => session.speakerIds.includes(speaker.id)),
    }))

    return (
        <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                {DateTime.fromISO(day).toFormat('MMMM d, yyyy')}
            </Typography>
            <Box sx={{ mt: 4 }}>
                <ScheduleGrid
                    sessions={sessionsWithSpeakers}
                    tracks={tracks}
                    timeSlots={timeSlots}
                    startTime={startTime}
                    categories={categories}
                />
            </Box>
        </Paper>
    )
}
