import { Box, Chip, IconButton, Link, Stack, Typography } from '@mui/material'
import { DeleteRounded } from '@mui/icons-material'
import EditIcon from '@mui/icons-material/Edit'
import { Ticket } from '../../../../types'
import { useFirestoreDocumentDeletion } from '../../../../services/hooks/firestoreMutationHooks'
import { collections } from '../../../../services/firebase'
import { doc } from 'firebase/firestore'
import { ConfirmTooltipButton } from '../../../../components/ConfirmTooltipButton'
import { DateTime } from 'luxon'

export type TicketItemProps = {
    ticket: Ticket
    eventId: string
}

export const TicketItem = ({ ticket, eventId }: TicketItemProps) => {
    const deletion = useFirestoreDocumentDeletion(doc(collections.tickets(eventId), ticket.id))
    const formatDate = (date: Ticket['startDate']) => (date ? date.toLocaleString(DateTime.DATE_MED) : 'TBD')
    const dateRangeLabel = `${formatDate(ticket.startDate)} → ${formatDate(ticket.endDate)}`

    return (
        <Box
            borderRadius={2}
            marginRight={1}
            marginBottom={1}
            paddingY={1}
            paddingX={2}
            bgcolor="#88888888"
            display="flex"
            justifyContent="space-between"
            alignItems="center">
            <Box>
                <Typography variant="h6">{ticket.name}</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                        {ticket.price} {ticket.currency || 'EUR'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        •
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {ticket.ticketsCount} tickets
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        •
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {dateRangeLabel}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    {ticket.available && <Chip label="Available" color="success" size="small" />}
                    {ticket.soldOut && <Chip label="Sold Out" color="error" size="small" />}
                    {ticket.highlighted && <Chip label="Highlighted" color="primary" size="small" />}
                </Box>
            </Box>
            <Stack direction="row" spacing={1}>
                <IconButton aria-label="Edit ticket" component={Link} href={`/tickets/${ticket.id}`} edge="end">
                    <EditIcon />
                </IconButton>

                <ConfirmTooltipButton
                    aria-label="Delete ticket"
                    confirmMessage="Are you sure you want to delete this ticket?"
                    confirmButtonText="Delete"
                    buttonType="iconButton"
                    onClick={async (e) => {
                        e.stopPropagation()
                        await deletion.mutate()
                    }}>
                    <DeleteRounded />
                </ConfirmTooltipButton>
            </Stack>
        </Box>
    )
}
