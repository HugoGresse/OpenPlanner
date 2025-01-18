import * as React from 'react'
import { Box, Typography, Divider } from '@mui/material'
import { DateTime } from 'luxon'
import { JsonSession } from '../../../events/actions/updateWebsiteActions/jsonTypes'

type SessionItemProps = {
    session: JsonSession
}

export const SessionItem = ({ session }: SessionItemProps) => {
    return (
        <Box>
            <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h6" color="primary">
                    {session.dateStart && DateTime.fromISO(session.dateStart).toFormat('HH:mm')}
                </Typography>
                <Typography variant="h6">{session.title}</Typography>
            </Box>
            {session.abstract && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {session.abstract}
                </Typography>
            )}
            <Divider sx={{ mt: 2 }} />
        </Box>
    )
}
