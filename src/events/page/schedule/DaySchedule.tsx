import * as React from 'react'
import { StartEndTime } from '../../../utils/dates/diffDays'
import { Box } from '@mui/material'
import { Session, Track } from '../../../types'
import { generateTimeSlots } from '../../../utils/dates/generateTimeSlots'
import { CalendarSlot } from './components/CalendarSlot'
import { DayScheduleHeader } from './DayScheduleHeader'

export type DayScheduleProps = {
    day: StartEndTime
    tracks: Track[]
    sessions: Session[]
    updateSession: (session: Session) => void
}
export const DaySchedule = ({ day, tracks, sessions, updateSession }: DayScheduleProps) => {
    const timeSlot = generateTimeSlots(day.start, day.end)

    return (
        <Box
            component="li"
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                marginRight: 4,
                paddingTop: 2,
            }}>
            <DayScheduleHeader tracks={tracks} startTime={day.start} />

            <Box display="flex" flexDirection="column">
                {timeSlot.map((slot) => {
                    return (
                        <CalendarSlot
                            key={slot.start.valueOf()}
                            tracks={tracks}
                            sessions={sessions}
                            startEndTime={slot}
                            updateSession={updateSession}
                        />
                    )
                })}
            </Box>
        </Box>
    )
}
