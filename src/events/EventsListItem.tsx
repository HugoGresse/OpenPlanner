import * as React from 'react'
import { Event } from '../types'
import { Button, Link } from '@mui/material'

export type EventsListItemProps = {
    event: Event
}
export const EventsListItem = ({ event }: EventsListItemProps) => {
    return (
        <Button component={Link} variant="contained" key={event.id} href={`/events/${event.id}`}>
            {event.name}
        </Button>
    )
}
