import * as React from 'react'
import { Event } from '../../../types'
import { Button, Card, Container, Link, Typography } from '@mui/material'
import { useSession } from '../../../services/hooks/useSession'
import { useRoute } from 'wouter'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { ArrowBack } from '@mui/icons-material'

export type EventSessionProps = {
    event: Event
}
export const EventSession = ({ event }: EventSessionProps) => {
    const [_, params] = useRoute('/:routeName/:sessionId*')
    const sessionId = params?.sessionId

    if (!sessionId) {
        return null
    }

    const sessionResult = useSession(event.id, sessionId)

    if (sessionResult.isLoading || !sessionResult.data) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={sessionResult} />
    }

    const session = sessionResult.data

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Card sx={{ paddingX: 2 }}>
                <Button href="/sessions" component={Link} startIcon={<ArrowBack />}>
                    All sessions
                </Button>

                <Typography variant="h2">{session.title}</Typography>

                {Object.entries(session).map(([key, value]) => (
                    <Typography key={key}>
                        {key}: {typeof value === 'object' ? JSON.stringify(value, null, 4) : `${value}`}
                    </Typography>
                ))}
            </Card>
        </Container>
    )
}
