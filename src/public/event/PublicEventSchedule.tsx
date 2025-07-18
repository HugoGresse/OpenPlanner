import { Box, Typography } from '@mui/material'
import { DateTime } from 'luxon'
import { JsonSession, JsonPublicOutput } from '../../../functions/src/api/routes/deploy/updateWebsiteActions/jsonTypes'
import { useLocation, useRoute, useSearchParams } from 'wouter'
import { ScheduleHeader } from './components/ScheduleHeader'
import { DayTabs } from './components/DayTabs'
import { DaySchedule } from './components/DaySchedule'
import { useMemo } from 'react'
import { useCallback } from 'react'

export type PublicEventScheduleProps = {
    eventId: string
    event: JsonPublicOutput
}

export const PublicEventSchedule = ({ eventId, event }: PublicEventScheduleProps) => {
    const [_, setLocation] = useLocation()
    const [_2, params] = useRoute('/schedule/:day')
    const [searchParams] = useSearchParams()
    const selectedDay = params?.day
    const hideHeader = searchParams.get('hideHeader') === 'true'

    const sessionsByDay = useMemo(() => {
        const sessions = event.sessions
        const grouped = new Map<string, JsonSession[]>()

        sessions.forEach((session) => {
            if (session.dateStart) {
                const day = DateTime.fromISO(session.dateStart).toFormat('yyyy-MM-dd')
                if (!grouped.has(day)) {
                    grouped.set(day, [])
                }
                grouped.get(day)?.push(session)
            }
        })

        // Sort sessions within each day by start time
        grouped.forEach((sessions) => {
            sessions.sort((a, b) => {
                if (!a.dateStart || !b.dateStart) return 0
                return DateTime.fromISO(a.dateStart).toMillis() - DateTime.fromISO(b.dateStart).toMillis()
            })
        })

        return grouped
    }, [event.sessions])

    const sortedDays = useMemo(() => Array.from(sessionsByDay.keys()).sort(), [sessionsByDay])

    const handleDayChange = useCallback(
        (_: React.SyntheticEvent, day: string) => {
            setLocation(`/schedule/${day}`)
        },
        [setLocation]
    )

    if (!selectedDay || !sessionsByDay.has(selectedDay)) {
        return null // Let the parent component handle the redirect
    }

    const currentSessions = sessionsByDay.get(selectedDay) || []

    return (
        <Box
            display="flex"
            flexDirection="column"
            gap={2}
            p={0}
            mt={2}
            justifyContent="center"
            alignItems="center"
            sx={{ minHeight: 'calc(100vh - 124px)' }} // Subtract margin-top value to prevent overflow
        >
            {!hideHeader && (
                <ScheduleHeader
                    eventName={event.event.name}
                    logoUrl={event.event.logoUrl}
                    colorBackground={event.event.colorBackground}
                />
            )}

            <DayTabs days={sortedDays} selectedDay={selectedDay} onDayChange={handleDayChange} />

            <DaySchedule
                day={selectedDay}
                tracks={event.event.tracks}
                sessions={currentSessions}
                speakersData={event.speakers}
                categories={event.event.categories}
            />

            <Box
                sx={{
                    marginTop: 'auto',
                    py: 2,
                }}>
                <Typography variant="caption" color="text.secondary">
                    Updated on {DateTime.fromISO(event.generatedAt).toLocaleString(DateTime.DATETIME_FULL)}
                </Typography>
            </Box>
        </Box>
    )
}
