import { Box, Button, Card, Container, Typography } from '@mui/material'
import * as React from 'react'
import { useState } from 'react'
import { Event, Speaker } from '../../../types'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { EventSpeakerItem } from './EventSpeakerItem'
import { useSpeakers } from '../../../services/hooks/useSpeakersMap'
import { RequireConferenceHallConnections } from '../../../components/RequireConferenceHallConnections'
import { SpeakersFromConferenceHallUpdaterDialog } from './components/SpeakersFromConferenceHallUpdaterDialog'

export type EventSpeakersProps = {
    event: Event
    eventUpdated: () => Promise<any>
}
export const EventSpeakers = ({ event }: EventSpeakersProps) => {
    const speakers = useSpeakers(event.id)
    const [updaterDialogOpen, setUpdaterDialogOpen] = useState(false)

    if (speakers.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={speakers} />
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
                <Typography>{speakers.data?.length} speakers</Typography>
                <RequireConferenceHallConnections event={event}>
                    <Button onClick={() => setUpdaterDialogOpen(true)}>
                        Update speakers infos from ConferenceHall
                    </Button>
                </RequireConferenceHallConnections>
                <Button href="/speakers/new" variant="contained">
                    Add speaker
                </Button>
            </Box>
            <Card sx={{ paddingX: 2 }}>
                {speakers.data?.map((speaker: Speaker) => (
                    <EventSpeakerItem key={speaker.id} speaker={speaker} />
                ))}
            </Card>
            {updaterDialogOpen && (
                <SpeakersFromConferenceHallUpdaterDialog
                    event={event}
                    speakers={speakers.data || []}
                    isOpen={updaterDialogOpen}
                    onClose={() => {
                        setUpdaterDialogOpen(false)
                        // noinspection JSIgnoredPromiseFromCall
                        speakers.refetch()
                    }}
                />
            )}
        </Container>
    )
}
