import { Box, Button, Card, Container, Typography } from '@mui/material'
import { Event, Ticket } from '../../../types'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { useTickets } from '../../../services/hooks/useTickets'
import { TicketItem } from './components/TicketItem'

export type EventTicketsProps = {
    event: Event
}

export const EventTickets = ({ event }: EventTicketsProps) => {
    const tickets = useTickets(event.id)

    if (tickets.isLoading || tickets.isError || !tickets.data) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={tickets} />
    }

    const ticketsData: Ticket[] = tickets.data

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
                <Typography>{ticketsData.length} tickets</Typography>
            </Box>
            <Card sx={{ padding: 2, minHeight: '50vh' }}>
                {ticketsData.length === 0 ? (
                    <Typography color="textSecondary">No ticket types yet. Create one to get started.</Typography>
                ) : (
                    <Box sx={{ display: 'grid', gap: 2 }}>
                        {ticketsData.map((ticket: Ticket) => (
                            <TicketItem key={ticket.id} ticket={ticket} eventId={event.id} />
                        ))}
                    </Box>
                )}
            </Card>
            <Box marginY={2}>
                <Button href="/tickets/new">Add ticket</Button>
            </Box>
        </Container>
    )
}
