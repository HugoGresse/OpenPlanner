import { Box } from '@mui/material'
import * as React from 'react'
import { Track } from '../../../../types'
import { StartEndTime } from '../../../../utils/diffDays'

export type CalendarSlotProps = {
    tracks: Track[]
    startEndTime: StartEndTime
}

export const SlotTimeWidth = 'calc(100vw * 0.05)'
export const SlotWidth = 'calc(100vw * 0.1)'

export const CalendarSlot = ({ tracks, startEndTime }: CalendarSlotProps) => {
    const time = startEndTime.start.toLocaleString({
        hour: 'numeric',
        minute: '2-digit',
    })

    return (
        <Box
            display="flex"
            sx={{
                borderTop: '1px solid #DDD',
            }}>
            <Box
                sx={{
                    width: 'calc(100vw * 0.05)',
                }}>
                {time}
            </Box>

            {tracks.map((track) => (
                <Box
                    key={track.id}
                    sx={{
                        border: '1px dashed #ddd',
                        minWidth: SlotWidth,
                    }}></Box>
            ))}
        </Box>
    )
}
