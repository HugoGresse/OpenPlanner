import * as React from 'react'
import { Box, Button, Card, Container, Link, Typography } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useLocation, useRoute } from 'wouter'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { TicketForm } from './components/TicketForm'
import { useFirestoreDocumentMutation } from '../../../services/hooks/firestoreMutationHooks'
import { useTickets } from '../../../services/hooks/useTickets'
import { Event, Ticket } from '../../../types'

export type EventTicketProps = {
    event: Event
}
export const EventTicket = ({ event }: EventTicketProps) => {
    const [_, params] = useRoute('/:routeName/:ticketId/*?')
    const tickets = useTickets(event.id)
    const [_2, setLocation] = useLocation()

    const ticketId = params?.ticketId

    const mutation = useFirestoreDocumentMutation(doc(collections.tickets(event.id), ticketId))

    if (tickets.isLoading || !tickets.data) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={tickets} />
    }

    const ticket = tickets.data.find((t: Ticket) => t.id === ticketId)

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
