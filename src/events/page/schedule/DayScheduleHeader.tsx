import * as React from 'react'
import { Track } from '../../../types'
import { DateTime } from 'luxon'
import { Box, Typography } from '@mui/material'
import { SlotTimeWidth, SlotWidth } from './scheduleConstants'

export type DayScheduleHeaderProps = {
    tracks: Track[]
    startTime: DateTime
}
export const DayScheduleHeader = ({ tracks, startTime }: DayScheduleHeaderProps) => {
    const dayHuman = startTime.toLocaleString({
        month: 'long',
        day: 'numeric',
        weekday: 'long',
    })

    return (
        <>
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
        </>
    )
}