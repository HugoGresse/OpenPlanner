import * as React from 'react'
import { useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { Session } from '../../../types'
import { SessionCard } from './components/SessionCard'
import { UseQueryResult } from 'react-query'
import { SessionCardMinHeight } from './scheduleConstants'
import { DocumentData } from '@firebase/firestore'

export type NoDatesSessionsPickerProps = {
    sessions: UseQueryResult<DocumentData>
    updateSession: (session: Session) => void
}
export const NoDatesSessionsPicker = ({ sessions, updateSession }: NoDatesSessionsPickerProps) => {
    const [sessionsToDisplay, setSessionsToDisplay] = useState<Session[]>([])

    useEffect(() => {
        if (sessions.data) {
            setSessionsToDisplay(
                sessions.data.filter((session: Session) => {
                    return !session.trackId || !session.dates || !session.dates.start
                })
            )
        }
    }, [sessions])

    if (!sessionsToDisplay.length) {
        return null
    }

    return (
        <Box
            sx={{
                display: 'flex',
                position: 'sticky',
                top: 68,
                left: 12,
                zIndex: 100,
                backgroundColor: '#EEE',
                height: SessionCardMinHeight,
                minHeight: 150,
                padding: 2,
                margin: 2,
                border: '2px dashed #d8d8d8',
                borderRadius: 2,
                overflowX: 'auto',
                overflowY: 'hidden',
            }}>
            <Typography sx={{ width: 80, marginRight: 2 }}>Sessions without times:</Typography>
            {sessionsToDisplay.map((session: Session) => (
                <Box key={session.id} mr={1} height={SessionCardMinHeight}>
                    <SessionCard session={session} absolute={false} updateSession={updateSession} />
                </Box>
            ))}
        </Box>
    )
}
