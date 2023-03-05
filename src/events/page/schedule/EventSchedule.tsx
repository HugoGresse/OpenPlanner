import { Box, Button, Card, Link, Typography } from '@mui/material'
import * as React from 'react'
import { DndProvider } from 'react-dnd'
import { Event } from '../../../types'
import { getIndividualDays } from '../../../utils/diffDays'
import { DaySchedule } from './DaySchedule'
import { HTML5Backend } from 'react-dnd-html5-backend'

export type EventScheduleProps = {
    event: Event
}
export const EventSchedule = ({ event }: EventScheduleProps) => {
    const daysArray = getIndividualDays(event.dates.start, event.dates.end)

    if (!daysArray.length) {
        return (
            <Card sx={{ paddingX: 2 }}>
                <Typography fontWeight="600" mt={2}>
                    The event does not have date or it last less than a very small second.
                </Typography>
                <Button component={Link} href="/settings">
                    Add a date here
                </Button>
            </Card>
        )
    }
    if (!event.tracks.length) {
        return (
            <Card sx={{ paddingX: 2 }}>
                <Typography fontWeight="600" mt={2}>
                    The event does not have at least one track.
                </Typography>
                <Button component={Link} href="/settings">
                    Add a track here
                </Button>
            </Card>
        )
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <Box height="100%">
                <Box component="ul" display="flex" margin={0} padding={0}>
                    {daysArray.map((startEndTime) => (
                        <DaySchedule key={startEndTime.start.valueOf()} day={startEndTime} tracks={event.tracks} />
                    ))}
                </Box>
            </Box>
        </DndProvider>
    )
}
