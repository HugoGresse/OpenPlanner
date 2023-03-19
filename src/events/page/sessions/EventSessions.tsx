import { Box, Button, Card, Container } from '@mui/material'
import * as React from 'react'
import { Event, Session } from '../../../types'
import { useSessions } from '../../../services/hooks/useSessions'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { EventSessionItem } from './EventSessionItem'

export type EventSessionsProps = {
    event: Event
    eventUpdated: () => Promise<any>
}
export const EventSessions = ({ event, eventUpdated }: EventSessionsProps) => {
    const sessions = useSessions(event.id)

    if (sessions.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={sessions} />
    }

    const formats = event.formats

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="flex-end">
                <Button onClick={() => {}}>Import proposals from ConferenceHall</Button>
            </Box>
            <Card sx={{ paddingX: 2 }}>
                {sessions.data?.map((session: Session) => (
                    <EventSessionItem key={session.id} session={session} formats={formats} />
                ))}
            </Card>
        </Container>
    )
}
