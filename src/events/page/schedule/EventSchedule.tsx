import { Box, Button, Card, Link, Typography } from '@mui/material'
import * as React from 'react'
import { DndProvider } from 'react-dnd'
import { Event, Session } from '../../../types'
import { getIndividualDays } from '../../../utils/diffDays'
import { DaySchedule } from './DaySchedule'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useSessions } from '../../../services/hooks/useSessions'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { NoDatesSessionsPicker } from './NoDatesSessionsPicker'
import { updateSession } from '../../actions/updateSession'

export type EventScheduleProps = {
    event: Event
}
export const EventSchedule = ({ event }: EventScheduleProps) => {
    const daysArray = getIndividualDays(event.dates.start, event.dates.end)
    const sessions = useSessions(event.id)

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

    const updateSessionAndRefetch = (session: Session) => {
        return updateSession(event.id, session).then(() => sessions.refetch())
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <FirestoreQueryLoaderAndErrorDisplay hookResult={sessions} />
            <NoDatesSessionsPicker sessions={sessions} updateSession={updateSessionAndRefetch} />
            <Box height="100%">
                <Box component="ul" display="flex" margin={0} padding={0}>
                    {daysArray.map((startEndTime) => (
                        <DaySchedule
                            key={startEndTime.start.valueOf()}
                            day={startEndTime}
                            tracks={event.tracks}
                            sessions={(sessions.data as Session[]) || []}
                            updateSession={updateSessionAndRefetch}
                        />
                    ))}
                </Box>
            </Box>
        </DndProvider>
    )
}
