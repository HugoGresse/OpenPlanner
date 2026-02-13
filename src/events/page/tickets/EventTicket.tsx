import * as React from 'react'
import { Box, Button, Card, Container, Link, Typography } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useLocation, useRoute } from 'wouter'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { TicketForm } from './components/TicketForm'
import { useFirestoreDocumentMutation } from '../../../services/hooks/firestoreMutationHooks'
import { useTicket } from '../../../services/hooks/useTicket'
import { Event, Ticket } from '../../../types'

export type EventTicketProps = {
    event: Event
}
export const EventTicket = ({ event }: EventTicketProps) => {
    const [_, params] = useRoute('/:routeName/:ticketId/*?')
    const [_2, setLocation] = useLocation()

    const ticketId = params?.ticketId
    const ticketResult = useTicket(event.id, typeof ticketId === 'string' ? ticketId : null)

    if (!ticketId || typeof ticketId !== 'string') {
        setLocation('/tickets')
        return null
    }

    const mutation = useFirestoreDocumentMutation(doc(collections.tickets(event.id), ticketId))

    if (ticketResult.isLoading || !ticketResult.data) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={ticketResult} />
    }

    const ticket = ticketResult.data

    if (!ticket) {
        setLocation('/tickets')
        return null
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }} key={ticketId}>
            <Box display="flex" justifyContent="space-between" mt={2}>
                <Button startIcon={<ArrowBack />} component={Link} href="/tickets">
                    All tickets
                </Button>
            </Box>
            <Card sx={{ paddingX: 2 }}>
                <Typography variant="h2">{ticket.name}</Typography>

                <TicketForm
                    event={event}
                    ticket={ticket}
                    onSubmit={async (data) => {
                        await mutation.mutate(data)
                        setLocation('/tickets')
                    }}
                />
            </Card>
        </Container>
    )
}
