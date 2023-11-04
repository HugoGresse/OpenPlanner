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
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { navigateBackOrFallbackTo } from '../../../utils/navigateBackOrFallbackTo'
import {
    useFirestoreDocumentDeletion,
    useFirestoreDocumentMutation,
} from '../../../services/hooks/firestoreMutationHooks'

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
    const mutation = useFirestoreDocumentMutation(doc(collections.sessions(event.id), sessionId))

    if (sessionResult.isLoading || !sessionResult.data) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={sessionResult} />
    }

    const session = sessionResult.data

    const goBack = () => navigateBackOrFallbackTo('/sessions', setLocation)

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Button onClick={goBack} startIcon={<ArrowBack />}>
                {getQueryParams().backTo ? getQueryParams().backTo : 'All sessions'}
            </Button>
            <Card sx={{ paddingX: 2 }}>
                <Typography variant="h2">{session.title}</Typography>

                <EventSessionForm event={event} session={session} onSubmit={(session) => mutation.mutate(session)} />
                {mutation.isError && (
                    <Typography color="error">Error while saving session: {mutation.error?.message}</Typography>
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
