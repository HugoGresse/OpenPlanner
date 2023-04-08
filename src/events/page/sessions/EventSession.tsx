import * as React from 'react'
import { useState } from 'react'
import { Event } from '../../../types'
import { Box, Button, Card, Container, DialogContentText, Typography } from '@mui/material'
import { useSession } from '../../../services/hooks/useSession'
import { useLocation, useRoute } from 'wouter'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { ArrowBack } from '@mui/icons-material'
import { getQueryParams } from '../../../utils/getQuerySearchParameters'
import { EventSessionForm } from './EventSessionForm'
import { useFirestoreDocumentDeletion, useFirestoreDocumentMutation } from '@react-query-firebase/firestore'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { queryClient } from '../../../App'

export type EventSessionProps = {
    event: Event
}
export const EventSession = ({ event }: EventSessionProps) => {
    const [_, params] = useRoute('/:routeName/:sessionId*')
    const [_2, setLocation] = useLocation()
    const sessionId = params?.sessionId || ''
    const sessionResult = useSession(event.id, sessionId)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const documentDeletion = useFirestoreDocumentDeletion(doc(collections.sessions(event.id), sessionId))

    const mutation = useFirestoreDocumentMutation(doc(collections.sessions(event.id), sessionId), {
        merge: true,
    })

    if (sessionResult.isLoading || !sessionResult.data) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={sessionResult} />
    }

    const session = sessionResult.data

    const goBack = () => setLocation(getQueryParams().schedule ? '/schedule' : '/sessions')

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Card sx={{ paddingX: 2 }}>
                <Button onClick={goBack} startIcon={<ArrowBack />}>
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

            <Box mt={2}>
                <Button color="warning" onClick={() => setDeleteOpen(true)}>
                    Delete session
                </Button>
            </Box>

            <ConfirmDialog
                open={deleteOpen}
                title="Delete this session?"
                acceptButton="Delete session"
                disabled={documentDeletion.isLoading}
                loading={documentDeletion.isLoading}
                cancelButton="cancel"
                handleClose={() => setDeleteOpen(false)}
                handleAccept={async () => {
                    await documentDeletion.mutate()
                    setDeleteOpen(false)
                    await queryClient.invalidateQueries(['sessions', event.id])
                    goBack()
                }}>
                <DialogContentText id="alert-dialog-description">
                    {' '}
                    Delete the session {session.title} from this event (not the session's speaker(s))
                </DialogContentText>
            </ConfirmDialog>
        </Container>
    )
}
