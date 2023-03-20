import { Box, Button, Card, Container, Typography } from '@mui/material'
import * as React from 'react'
import { useState } from 'react'
import { Event, Session } from '../../../types'
import { useSessions } from '../../../services/hooks/useSessions'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { EventSessionItem } from './EventSessionItem'
import { RequireConferenceHallConnections } from '../../../components/RequireConferenceHallConnections'
import { SessionsImporterFromConferenceHallDialog } from './components/SessionsImporterFromConferenceHallDialog'

export type EventSessionsProps = {
    event: Event
}
export const EventSessions = ({ event }: EventSessionsProps) => {
    const sessions = useSessions(event)
    const [sessionsImportOpen, setSessionsImportOpen] = useState(false)

    if (sessions.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={sessions} />
    }

    const formats = event.formats

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
                <Typography>{sessions.data?.length} sessions</Typography>
                <RequireConferenceHallConnections event={event}>
                    <Button onClick={() => setSessionsImportOpen(true)}>Import proposals from ConferenceHall</Button>
                </RequireConferenceHallConnections>
                <Button href="/sessions/new" variant="contained">
                    Add session
                </Button>
            </Box>
            <Card sx={{ paddingX: 2 }}>
                {sessions.data?.map((session: Session) => (
                    <EventSessionItem key={session.id} session={session} formats={formats} />
                ))}
            </Card>
            {sessionsImportOpen && (
                <SessionsImporterFromConferenceHallDialog
                    event={event}
                    isOpen={sessionsImportOpen}
                    onClose={() => {
                        setSessionsImportOpen(false)
                        // noinspection JSIgnoredPromiseFromCall
                        sessions.refetch()
                    }}
                />
            )}
        </Container>
    )
}
