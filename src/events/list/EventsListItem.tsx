import * as React from 'react'
import { Event } from '../../types'
import { Avatar, Box, Card, Stack, Typography } from '@mui/material'
import { Link } from 'wouter'
import { DateTime } from 'luxon'
import EventIcon from '@mui/icons-material/Event'

export type EventsListItemProps = {
    event: Event
}

const formatDateRange = (start: Date | null, end: Date | null): string | null => {
    if (!start && !end) return null
    const startDT = start ? DateTime.fromJSDate(start) : null
    const endDT = end ? DateTime.fromJSDate(end) : null
    if (startDT && endDT) {
        if (startDT.hasSame(endDT, 'day')) return startDT.toLocaleString(DateTime.DATE_MED)
        const sameYear = startDT.hasSame(endDT, 'year')
        return `${startDT.toLocaleString({ month: 'short', day: 'numeric' })} – ${endDT.toLocaleString(
            sameYear ? { month: 'short', day: 'numeric' } : DateTime.DATE_MED
        )}, ${endDT.year}`
    }
    return (startDT ?? endDT)!.toLocaleString(DateTime.DATE_MED)
}

export const EventsListItem = ({ event }: EventsListItemProps) => {
    const dateRange = formatDateRange(event.dates.start, event.dates.end)
    const accentColor = event.color || undefined

    return (
        <Link
            href={`/events/${event.id}`}
            style={{ textDecoration: 'none', display: 'block', width: '100%', height: '100%' }}>
            <Card
                variant="outlined"
                sx={{
                    height: '100%',
                    p: 2,
                    borderLeft: accentColor ? `4px solid ${accentColor}` : undefined,
                    transition: 'background-color 0.15s ease, transform 0.15s ease',
                    cursor: 'pointer',
                    '&:hover': {
                        bgcolor: 'action.hover',
                    },
                }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    {event.logoUrl ? (
                        <Avatar
                            src={event.logoUrl}
                            alt={event.name}
                            variant="rounded"
                            sx={{ width: 48, height: 48, bgcolor: 'transparent' }}
                        />
                    ) : (
                        <Avatar
                            variant="rounded"
                            sx={{ width: 48, height: 48, bgcolor: accentColor || 'primary.main' }}>
                            {event.name.charAt(0).toUpperCase()}
                        </Avatar>
                    )}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={600} noWrap title={event.name} color="text.primary">
                            {event.name}
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary' }}>
                            <EventIcon fontSize="inherit" />
                            <Typography variant="body2" noWrap>
                                {dateRange ?? 'No date set'}
                            </Typography>
                        </Stack>
                    </Box>
                </Stack>
            </Card>
        </Link>
    )
}
