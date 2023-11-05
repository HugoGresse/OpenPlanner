import * as React from 'react'
import { Event } from '../../../types'
import { Button, Card, Container, Typography } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { EventSessionForm } from './EventSessionForm'
import { collections } from '../../../services/firebase'
import { useLocation } from 'wouter'
import { useFirestoreCollectionMutation } from '../../../services/hooks/firestoreMutationHooks'

export type NewEventProps = {
    event: Event
}
export const NewSession = ({ event }: NewEventProps) => {
    const [_, setLocation] = useLocation()
    const mutation = useFirestoreCollectionMutation(collections.sessions(event.id))

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Card sx={{ paddingX: 2 }}>
                <Button href="/sessions" startIcon={<ArrowBack />}>
                    Cancel
                </Button>

                <Typography variant="h2">New session</Typography>

                <EventSessionForm
                    event={event}
                    onSubmit={(session) => {
                        return mutation
                            .mutate({
                                ...session,
                                tags: [],
                            })
                            .then(() => {
                                setLocation('/sessions')
                            })
                    }}
                />

                {mutation.isError && (
                    <Typography color="error">Error while adding session: {mutation.error?.message}</Typography>
                )}
            </Card>
        </Container>
    )
}
