import * as React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { DateTime } from 'luxon'
import { JsonSession, JsonSpeaker } from '../../../events/actions/updateWebsiteActions/jsonTypes'
import { Category } from '../../../types'
import { SessionItem } from './SessionItem'

// Grid configuration constants
const GRID_CONFIG = {
    UNIT_HEIGHT: 6, // Base unit for grid scaling (in pixels)
    MAX_SESSION_HEIGHT: 200, // Maximum height for a session item (in pixels)
    MINUTES_PER_UNIT: 0.5, // How many minutes one grid unit represents
} as const

// Helper functions for grid calculations
const calculateGridRows = (hoursInDay: number) => {
    return hoursInDay * (60 / GRID_CONFIG.MINUTES_PER_UNIT)
}

const calculateAdjustedUnitHeight = (sessions: JsonSession[], startTime: DateTime) => {
    // Find the longest session duration
    const maxDuration = Math.max(...sessions.map((s) => s.durationMinutes || 0))
    const theoreticalHeight = (maxDuration / GRID_CONFIG.MINUTES_PER_UNIT) * GRID_CONFIG.UNIT_HEIGHT

    // If the theoretical height exceeds MAX_SESSION_HEIGHT, calculate adjusted unit height
    if (theoreticalHeight > GRID_CONFIG.MAX_SESSION_HEIGHT) {
        const adjustedHeight = GRID_CONFIG.MAX_SESSION_HEIGHT / (maxDuration / GRID_CONFIG.MINUTES_PER_UNIT)
        return adjustedHeight
    }

    return GRID_CONFIG.UNIT_HEIGHT
}

const calculateSessionHeight = (durationMinutes: number, unitHeight: number): number => {
    const rawHeight = (durationMinutes / GRID_CONFIG.MINUTES_PER_UNIT) * unitHeight
    return Math.min(rawHeight, GRID_CONFIG.MAX_SESSION_HEIGHT)
}

const calculateTopPosition = (minutesFromStart: number, unitHeight: number): number => {
    return (minutesFromStart / GRID_CONFIG.MINUTES_PER_UNIT) * unitHeight
}

type DayScheduleProps = {
    day: string
    sessions: JsonSession[]
    speakersData: JsonSpeaker[]
    categories: Category[]
}

export const DaySchedule = ({ day, sessions, speakersData, categories }: DayScheduleProps) => {
    // Group sessions by track
    const tracks = new Set(sessions.map((session) => session.trackId).filter(Boolean))
    const tracksList = Array.from(tracks)

    // Get earliest and latest times for the day, only considering the first track
    const timeSlots = sessions
        .filter((session) => session.dateStart && session.trackId === tracksList[0])
        .map((session) => DateTime.fromISO(session.dateStart!))
        .sort((a, b) => a.toMillis() - b.toMillis())

    const startTime = timeSlots[0]
    const endTime = timeSlots[timeSlots.length - 1].plus({ minutes: 60 }) // Add buffer at the end

    // Calculate total hours for the grid
    const hoursInDay = Math.ceil(endTime.diff(startTime, 'hours').hours)

    // Calculate adjusted unit height based on session durations
    const adjustedUnitHeight = calculateAdjustedUnitHeight(sessions, startTime)

    const sessionWithSpeakers = sessions.map((session) => ({
        ...session,
        speakersData: speakersData.filter((speaker) => session.speakerIds.includes(speaker.id)),
    }))

    return (
        <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                {DateTime.fromISO(day).toFormat('MMMM d, yyyy')}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 2, mt: 4 }}>
                {/* Track headers */}
                <Box
                    sx={{
                        gridColumn: '2',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${tracksList.length}, 1fr)`,
                        gap: 2,
                        mb: 2,
                    }}>
                    {tracksList.map((trackId) => (
                        <Typography key={trackId} variant="subtitle1" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                            {trackId}
                        </Typography>
                    ))}
                </Box>

                {/* Time axis and schedule grid container */}
                <Box
                    sx={{
                        gridColumn: '1/-1',
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: 2,
                    }}>
                    {/* Time axis */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateRows: `repeat(${calculateGridRows(hoursInDay)}, ${adjustedUnitHeight}px)`,
                            pr: 2,
                            borderRight: '1px solid rgba(0, 0, 0, 0.12)',
                        }}>
                        {timeSlots.map((time, index) => (
                            <Typography
                                key={index}
                                variant="caption"
                                sx={{
                                    gridRow: `${
                                        time.diff(startTime, 'minutes').minutes / GRID_CONFIG.MINUTES_PER_UNIT + 1
                                    }`,
                                    textAlign: 'right',
                                    pr: 1,
                                    position: 'relative',
                                    paddingTop: `${adjustedUnitHeight}px`,
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        right: -8,
                                        top: '50%',
                                        width: adjustedUnitHeight,
                                        height: 1,
                                        bgcolor: 'divider',
                                    },
                                }}>
                                {time.toFormat('HH:mm')}
                            </Typography>
                        ))}
                    </Box>

                    {/* Sessions grid */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${tracksList.length}, 1fr)`,
                            gridTemplateRows: `repeat(${calculateGridRows(hoursInDay)}, ${adjustedUnitHeight}px)`,
                            position: 'relative',
                        }}>
                        {sessionWithSpeakers.map((session) => {
                            if (!session.dateStart || !session.trackId) return null

                            const sessionStart = DateTime.fromISO(session.dateStart)
                            const minutesFromStart = sessionStart.diff(startTime, 'minutes').minutes
                            const trackIndex = tracksList.indexOf(session.trackId)
                            const width = session.extendWidth || 1

                            return (
                                <Box
                                    key={session.id}
                                    sx={{
                                        position: 'absolute',
                                        top: `${calculateTopPosition(minutesFromStart, adjustedUnitHeight)}px`,
                                        left: `${(trackIndex * 100) / tracksList.length}%`,
                                        width: `${(width * 100) / tracksList.length}%`,
                                        height: `${calculateSessionHeight(
                                            session.durationMinutes,
                                            adjustedUnitHeight
                                        )}px`,
                                        overflow: 'hidden',
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
                </Box>
            </Box>
        </Paper>
    )
}
