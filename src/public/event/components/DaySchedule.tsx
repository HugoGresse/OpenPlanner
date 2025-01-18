import * as React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { DateTime } from 'luxon'
import { JsonSession } from '../../../events/actions/updateWebsiteActions/jsonTypes'
import { SessionItem } from './SessionItem'

type DayScheduleProps = {
    day: string
    sessions: JsonSession[]
}

export const DaySchedule = ({ day, sessions }: DayScheduleProps) => {
    return (
        <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                {DateTime.fromISO(day).toFormat('MMMM d, yyyy')}
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
                {sessions.map((session) => (
                    <SessionItem key={session.id} session={session} />
                ))}
            </Box>
        </Paper>
    )
}
