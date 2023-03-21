import * as React from 'react'
import { Event } from '../../../types'
import { Button, Card, Container, Link, Typography } from '@mui/material'
import { useSpeaker } from '../../../services/hooks/useSpeaker'
import { useRoute } from 'wouter'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { ArrowBack } from '@mui/icons-material'
import { EventSpeakerForm } from './EventSpeakerForm'
import { useFirestoreDocumentMutation } from '@react-query-firebase/firestore'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'

export type EventSpeakerProps = {
    event: Event
}
export const EventSpeaker = ({ event }: EventSpeakerProps) => {
    const [_, params] = useRoute('/:routeName/:speakerId*')
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

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Card sx={{ paddingX: 2 }}>
                <Button href="/speakers" component={Link} startIcon={<ArrowBack />}>
                    All speaker
                </Button>

                <Typography variant="h2">{speaker.name}</Typography>

                <EventSpeakerForm
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
