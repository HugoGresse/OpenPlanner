import { Box } from '@mui/material'
import * as React from 'react'
import { Session, Track } from '../../../../types'
import { StartEndTime } from '../../../../utils/diffDays'
import { DateTime } from 'luxon'
import { CalendarTrackSlot } from './CalendarTrackSlot'

export type CalendarSlotProps = {
    tracks: Track[]
    startEndTime: StartEndTime
}

const fakeSession: Session = {
    title: 'session 1',
    id: 'i',
    tags: [],
    showInFeedback: false,
    hideTrackTitle: false,
    speakers: [],
    videoLink: null,
    presentationLink: null,
    language: null,
    image: null,
    format: null,
    abstract: null,
    conferenceHallId: null,
    trackId: 'lamour',
    dates: {
        start: DateTime.fromISO('2023-06-29T08:00:15'),
        end: DateTime.fromISO('2023-06-29T08:20:15'),
    },
}

const sessions = [fakeSession]

export const CalendarSlot = ({ tracks, startEndTime }: CalendarSlotProps) => {
    const time = startEndTime.start.toLocaleString({
        hour: 'numeric',
        minute: '2-digit',
    })

    const findSession = (trackId: string) => {
        return sessions.find((session) => {
            if (session.trackId === trackId) {
                if (session.dates?.start?.toFormat('T') === startEndTime.start.toFormat('T')) {
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
