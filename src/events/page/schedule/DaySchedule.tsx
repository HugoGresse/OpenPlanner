import * as React from 'react'
import { StartEndTime } from '../../../utils/diffDays'
import { Box, Typography } from '@mui/material'
import { Track } from '../../../types'
import { generateTimeSlots } from '../../../utils/generateTimeSlots'
import { CalendarSlot } from './components/CalendarSlot'
import { SlotTimeWidth, SlotWidth } from './scheduleConstants'

export type DayScheduleProps = {
    day: StartEndTime
    tracks: Track[]
}
export const DaySchedule = ({ day, tracks }: DayScheduleProps) => {
    const dayHuman = day.start.toLocaleString({
        month: 'long',
        day: 'numeric',
        weekday: 'long',
    })

    const timeSlot = generateTimeSlots(day.start, day.end)

    return (
        <Box
            component="li"
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}>
            <Typography>{dayHuman}</Typography>

            <Box display="flex">
                <Box width={SlotTimeWidth}></Box>
                {tracks.map((track) => (
                    <Box
                        key={track.id}
                        sx={{
                            border: '1px dashed #ddd',
                            minWidth: SlotWidth,
                        }}>
                        {track.name}
                    </Box>
                ))}
            </Box>

            <Box display="flex" flexDirection="column">
                {timeSlot.map((slot) => {
                    return <CalendarSlot key={slot.start.valueOf()} tracks={tracks} startEndTime={slot} />
                })}
            </Box>
        </Box>
    )
}
