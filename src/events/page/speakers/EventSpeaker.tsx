import * as React from 'react'
import { Event } from '../../../types'
import { Box, Button, Card, Container, IconButton, Link, Typography } from '@mui/material'
import { useSpeaker } from '../../../services/hooks/useSpeaker'
import { useRoute } from 'wouter'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { ArrowBack, ChevronLeft, ChevronRight } from '@mui/icons-material'
import { EventSpeakerForm } from './EventSpeakerForm'
import { useFirestoreDocumentMutation } from '@react-query-firebase/firestore'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { useSpeakers } from '../../../services/hooks/useSpeakersMap'

export type EventSpeakerProps = {
    event: Event
}
export const EventSpeaker = ({ event }: EventSpeakerProps) => {
    const [_, params] = useRoute('/:routeName/:speakerId*')
    const speakers = useSpeakers(event.id)
    const speakerId = params?.speakerId

    const mutation = useFirestoreDocumentMutation(doc(collections.speakers(event.id), speakerId), {
        merge: true,
    })

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

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" mt={2}>
                <Button href="/speakers" component={Link} startIcon={<ArrowBack />}>
                    All speaker
                </Button>
                <Box display="flex">
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
                        return mutation.mutateAsync(data)
                    }}
                />
                {mutation.isError && (
                    <Typography color="error">Error while saving speaker: {mutation.error.message}</Typography>
                )}
            </Card>
        </Container>
    )
}
