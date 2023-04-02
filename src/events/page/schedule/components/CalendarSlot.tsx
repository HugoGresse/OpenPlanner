import { Box } from '@mui/material'
import * as React from 'react'
import { Session, Track } from '../../../../types'
import { StartEndTime } from '../../../../utils/dates/diffDays'
import { CalendarTrackSlot } from './CalendarTrackSlot'
import { SlotHeight } from '../scheduleConstants'

export type CalendarSlotProps = {
    tracks: Track[]
    startEndTime: StartEndTime
    sessions: Session[]
    updateSession: (session: Session) => void
}

export const CalendarSlot = ({ tracks, startEndTime, sessions, updateSession }: CalendarSlotProps) => {
    const time = startEndTime.start.toLocaleString({
        hour: 'numeric',
        minute: '2-digit',
    })
    const minutes = startEndTime.start.minute

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

    const isEven = minutes % 10 === 0
    const borderStyle = isEven ? (minutes === 0 ? '1px solid #BBB' : '1px solid #DDD') : ''

    return (
        <Box
            display="flex"
            borderTop={borderStyle}
            height={SlotHeight}
            width="fit-content"
            sx={{
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    background: '#DDD',
                },
            }}>
            <Box
                sx={{
                    width: 'calc(100vw * 0.05)',
                    marginTop: '-5px',
                }}>
                {minutes % 10 === 0 ? time : ''}
            </Box>

            {tracks.map((track) => (
                <CalendarTrackSlot
                    startEndTime={startEndTime}
                    key={track.id}
                    track={track}
                    session={findSession(track.id)}
                    updateSession={updateSession}
                />
            ))}
        </Box>
    )
}
