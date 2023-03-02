import * as React from 'react'
import { Event } from '../../types'
import { Box, Button, Link } from '@mui/material'

export type EventsListItemProps = {
    event: Event
}
export const EventsListItem = ({ event }: EventsListItemProps) => {
    return (
        <Box component="li" marginRight={1} marginBottom={1} sx={{ listStyle: 'none' }}>
            <Button component={Link} variant="contained" href={`/events/${event.id}`} size="large">
                {event.name}
            </Button>
        </Box>
    )
}
