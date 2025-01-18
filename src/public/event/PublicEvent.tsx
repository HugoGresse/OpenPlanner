import * as React from 'react'
import { Box, Typography } from '@mui/material'
import { PublicEventLayout } from '../PublicEventLayout'
import { usePublicEvent } from '../hooks/usePublicEvent'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'
import { DateTime } from 'luxon'

export type PublicEventProps = {
    eventId: string
}

export const PublicEvent = ({ eventId }: PublicEventProps) => {
    const event = usePublicEvent(eventId)

    if (event.isLoading || !event.data) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <FirestoreQueryLoaderAndErrorDisplay hookResult={event} />
            </Box>
        )
    }

    const startDate = DateTime.fromISO(event.data.startDate).toFormat('MMMM d, yyyy')
    const endDate = DateTime.fromISO(event.data.endDate).toFormat('MMMM d, yyyy')

    return (
        <PublicEventLayout>
            <Box display="flex" flexDirection="column" gap={4}>
                <Typography variant="h1">{event.data.name}</Typography>

                <Box>
                    <Typography variant="h6" color="text.secondary">
                        {startDate} - {endDate}
                    </Typography>
                </Box>

                <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                    {event.data.description}
                </Typography>
            </Box>
        </PublicEventLayout>
    )
}
