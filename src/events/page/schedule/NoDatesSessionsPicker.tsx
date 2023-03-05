import * as React from 'react'
import { Box, Typography } from '@mui/material'
import { Session } from '../../../types'
import { SessionCard } from './components/SessionCard'
import { UseQueryResult } from 'react-query'
import { SessionCardMinHeight } from './scheduleConstants'
import { DocumentData } from '@firebase/firestore'

export type NoDatesSessionsPickerProps = {
    sessions: UseQueryResult<DocumentData>
}
export const NoDatesSessionsPicker = ({ sessions }: NoDatesSessionsPickerProps) => {
    if (!sessions.data?.length) {
        return null
    }

    return (
        <Box
            sx={{
                display: 'flex',
                position: 'relative',
                height: SessionCardMinHeight,
                minHeight: 150,
                padding: 2,
                margin: 2,
                border: '2px dashed #d8d8d8',
                borderRadius: 2,
            }}>
            <Typography sx={{ width: 80, marginRight: 2, wordBreak: 'break-word' }}>Sessions without times:</Typography>
            {sessions.data.map((session: Session) => (
                <Box key={session.id} mr={1} height={SessionCardMinHeight}>
                    <SessionCard session={session} absolute={false} />
                </Box>
            ))}
        </Box>
    )
}
