import * as React from 'react'
import { Event } from '../../../types'
import { Button, Card, Container, Typography } from '@mui/material'
import { useSession } from '../../../services/hooks/useSession'
import { useLocation, useRoute } from 'wouter'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { ArrowBack } from '@mui/icons-material'
import { getQueryParams } from '../../../utils/getQuerySearchParameters'
import { EventSessionForm } from './EventSessionForm'
import { useFirestoreDocumentMutation } from '@react-query-firebase/firestore'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'

export type EventSessionProps = {
    event: Event
}
export const EventSession = ({ event }: EventSessionProps) => {
    const [_, params] = useRoute('/:routeName/:sessionId*')
    const [_2, setLocation] = useLocation()
    const sessionId = params?.sessionId || ''
    const sessionResult = useSession(event.id, sessionId)

    const mutation = useFirestoreDocumentMutation(doc(collections.sessions(event.id), sessionId), {
        merge: true,
    })

    if (sessionResult.isLoading || !sessionResult.data) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={sessionResult} />
    }

    const session = sessionResult.data

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Card sx={{ paddingX: 2 }}>
                <Button
                    onClick={() => {
                        setLocation(getQueryParams().schedule ? '/schedule' : '/sessions')
                    }}
                    startIcon={<ArrowBack />}>
                    All sessions
                </Button>

                <Typography variant="h2">{session.title}</Typography>

                <EventSessionForm
                    event={event}
                    session={session}
                    onSubmit={(session) => mutation.mutateAsync(session)}
                />
                {mutation.isError && (
                    <Typography color="error">Error while saving session: {mutation.error.message}</Typography>
                )}
            </Card>
        </Container>
    )
}
