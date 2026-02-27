import * as React from 'react'
import { useLocation } from 'wouter'
import { collections } from '../../../services/firebase'
import { Button, Card, Container, Typography } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { Event } from '../../../types'
import { TicketForm } from './components/TicketForm'
import { useFirestoreCollectionMutation } from '../../../services/hooks/firestoreMutationHooks'

export type NewTicketProps = {
    event: Event
}
export const NewTicket = ({ event }: NewTicketProps) => {
    const [_, setLocation] = useLocation()
    const mutation = useFirestoreCollectionMutation(collections.tickets(event.id))

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Button href="/tickets" startIcon={<ArrowBack />}>
                Cancel
            </Button>
            <Card sx={{ paddingX: 2 }}>
                <Typography variant="h2">New ticket</Typography>

                <TicketForm
                    event={event}
                    onSubmit={(ticket) => {
                        return mutation.mutate(ticket).then(() => {
                            setLocation('/tickets')
                        })
                    }}
                />

                {mutation.isError && (
                    <Typography color="error">Error while adding ticket: {mutation.error?.message}</Typography>
                )}
            </Card>
        </Container>
    )
}
