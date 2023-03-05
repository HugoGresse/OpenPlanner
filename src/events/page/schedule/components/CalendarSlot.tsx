import { Box } from '@mui/material'
import * as React from 'react'
import { Session, Track } from '../../../../types'
import { StartEndTime } from '../../../../utils/diffDays'
import { CalendarTrackSlot } from './CalendarTrackSlot'

export type CalendarSlotProps = {
    tracks: Track[]
    startEndTime: StartEndTime
    sessions: Session[]
}

export const CalendarSlot = ({ tracks, startEndTime, sessions }: CalendarSlotProps) => {
    const time = startEndTime.start.toLocaleString({
        hour: 'numeric',
        minute: '2-digit',
    })

    const findSession = (trackId: string) => {
        return sessions.find((session) => {
            if (session.trackId === trackId) {
                if (session.dates?.start?.toFormat('D T') === startEndTime.start.toFormat('D T')) {
                    return true
                }
            }
            return false
        })
    }

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
                <CalendarTrackSlot key={track.id} track={track} session={findSession(track.id)} />
            ))}
        </Box>
    )
}
