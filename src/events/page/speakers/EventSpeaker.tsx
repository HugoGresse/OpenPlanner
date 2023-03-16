import * as React from 'react'
import { Event } from '../../../types'
import { Button, Card, Container, Link, Typography } from '@mui/material'
import { useSpeaker } from '../../../services/hooks/useSpeaker'
import { useRoute } from 'wouter'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { ArrowBack } from '@mui/icons-material'

export type EventSpeakerProps = {
    event: Event
}
export const EventSpeaker = ({ event }: EventSpeakerProps) => {
    const [_, params] = useRoute('/:routeName/:speakerId*')
    const speakerId = params?.speakerId

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

                {Object.entries(speaker).map(([key, value]) => (
                    <Typography key={key}>
                        {key}: {typeof value === 'object' ? JSON.stringify(value, null, 4) : `${value}`}
                    </Typography>
                ))}
            </Card>
        </Container>
    )
}
