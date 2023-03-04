import { Button, Card, Link, Typography } from '@mui/material'
import * as React from 'react'
import { Event } from '../../../types'
import { diffDays } from '../../../utils/diffDays'

export type EventScheduleProps = {
    event: Event
}
export const EventSchedule = ({ event }: EventScheduleProps) => {
    const days = diffDays(event.dates.start, event.dates.end)

    if (!days) {
        return (
            <Card sx={{ paddingX: 2 }}>
                <Typography fontWeight="600" mt={2}>
                    The event does not have date or it last less than a very small second
                </Typography>
                <Button component={Link} href="/settings">
                    Add a date here
                </Button>
            </Card>
        )
    }

    return <>TODO</>
}
