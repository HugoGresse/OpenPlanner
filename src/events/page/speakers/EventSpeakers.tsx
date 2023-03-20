import { Box, Card, Container, Typography } from '@mui/material'
import * as React from 'react'
import { Event, Speaker } from '../../../types'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { EventSpeakerItem } from './EventSpeakerItem'
import { useSpeakers } from '../../../services/hooks/useSpeakersMap'

export type EventSpeakersProps = {
    event: Event
    eventUpdated: () => Promise<any>
}
export const EventSpeakers = ({ event }: EventSpeakersProps) => {
    const speakers = useSpeakers(event.id)

    if (speakers.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={speakers} />
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
                <Typography>{speakers.data?.length} speakers</Typography>
            </Box>
            <Card sx={{ paddingX: 2 }}>
                {speakers.data?.map((speaker: Speaker) => (
                    <EventSpeakerItem key={speaker.id} speaker={speaker} />
                ))}
            </Card>
        </Container>
    )
}
