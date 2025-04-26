import { useState } from 'react'
import { Event } from '../../../types'
import { Box, Button, Card, Container, DialogContentText, IconButton, Link, Typography } from '@mui/material'
import { useSpeaker } from '../../../services/hooks/useSpeaker'
import { useLocation, useRoute, useSearch } from 'wouter'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { ArrowBack, ChevronLeft, ChevronRight } from '@mui/icons-material'
import { EventSpeakerForm } from './EventSpeakerForm'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { useSpeakers } from '../../../services/hooks/useSpeakersMap'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { getQueryParams } from '../../../utils/getQuerySearchParameters'
import {
    useFirestoreDocumentDeletion,
    useFirestoreDocumentMutation,
} from '../../../services/hooks/firestoreMutationHooks'
import { SpeakerSessions } from './components/SpeakerSessions'

export type EventSpeakerProps = {
    event: Event
}
export const EventSpeaker = ({ event }: EventSpeakerProps) => {
    const [_, params] = useRoute('/:routeName/:speakerId/*?')
    const [_2, setLocation] = useLocation()
    const speakers = useSpeakers(event.id)
    const speakerId = params?.speakerId
    const [deleteOpen, setDeleteOpen] = useState(false)
    const documentDeletion = useFirestoreDocumentDeletion(doc(collections.speakers(event.id), speakerId))
    const mutation = useFirestoreDocumentMutation(doc(collections.speakers(event.id), speakerId))

    if (!speakerId) {
        return null
    }

    const speakerResult = useSpeaker(event.id, speakerId)

    if (speakerResult.isLoading || !speakerResult.data) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={speakerResult} />
    }

    const speaker = speakerResult.data

    const goPrevOrNext = () => {
        if (!speakers.data) {
            return [null, null]
        }
        const currentIndex = speakers.data.findIndex((s) => s.id === speakerId)
        let prevLink = null
        let nextLink = null
        if (speakers.data[currentIndex - 1]) {
            prevLink = `/speakers/${speakers.data[currentIndex - 1].id}`
        }
        if (speakers.data[currentIndex + 1]) {
            nextLink = `/speakers/${speakers.data[currentIndex + 1].id}`
        }

        return [prevLink, nextLink]
    }

    const [prevLink, nextLink] = goPrevOrNext()

    const fromSession = getQueryParams().fromSession

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }} key={speakerId}>
            <Box display="flex" justifyContent="space-between" mt={2}>
                <Button
                    onClick={() => {
                        if (fromSession) {
                            setLocation(`/sessions/${fromSession}`)
                        } else {
                            setLocation('/speakers')
                        }
                    }}
                    startIcon={<ArrowBack />}>
                    {fromSession ? 'To session' : 'All speaker'}
                </Button>
                <Box display="flex" alignItems="center">
                    <Typography>
                        {speakers.data ? speakers.data.findIndex((s) => s.id === speakerId) + 1 : 0}/
                        {speakers.data ? speakers.data.length : 0}
                    </Typography>
                    <IconButton href={prevLink || ''} component={Link} disabled={!prevLink}>
                        <ChevronLeft />
                    </IconButton>
                    <IconButton href={nextLink || ''} component={Link} disabled={!nextLink}>
                        <ChevronRight />
                    </IconButton>
                </Box>
            </Box>
            <Card sx={{ paddingX: 2 }}>
                <Typography variant="h2">{speaker.name}</Typography>

                <EventSpeakerForm
                    event={event}
                    speaker={speaker}
                    onSubmit={(data) => {
                        return mutation.mutate(data)
                    }}
                    rightColumns={<SpeakerSessions event={event} speaker={speaker} />}
                />

                {mutation.isError && (
                    <Typography color="error">Error while saving speaker: {mutation.error?.message}</Typography>
                )}
            </Card>

            <Box mt={2}>
                <Button color="warning" onClick={() => setDeleteOpen(true)}>
                    Delete speaker
                </Button>
            </Box>

            <ConfirmDialog
                open={deleteOpen}
                title="Delete this speaker?"
                acceptButton="Delete speaker"
                disabled={documentDeletion.isLoading}
                loading={documentDeletion.isLoading}
                cancelButton="cancel"
                handleClose={() => setDeleteOpen(false)}
                handleAccept={async () => {
                    await documentDeletion.mutate()
                    setDeleteOpen(false)
                    setLocation('/speakers')
                }}>
                <DialogContentText id="alert-dialog-description">
                    {' '}
                    Delete the speaker {speaker.name} from this event (not the speaker's session(s))
                </DialogContentText>
            </ConfirmDialog>
        </Container>
    )
}
