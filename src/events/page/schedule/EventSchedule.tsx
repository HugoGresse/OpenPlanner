import { Box, Button, Card, Link, Typography } from '@mui/material'
import * as React from 'react'
import { DndProvider } from 'react-dnd'
import { Event, Session } from '../../../types'
import { diffDays } from '../../../utils/diffDays'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useSessions } from '../../../services/hooks/useSessions'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { NoDatesSessionsPicker } from './NoDatesSessionsPicker'
import { updateSession } from '../../actions/sessions/updateSession'
import FullCalendar from '@fullcalendar/react'
import resourceTimeGrid from '@fullcalendar/resource-timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import './eventschedule.css'

export type EventScheduleProps = {
    event: Event
}
export const EventSchedule = ({ event }: EventScheduleProps) => {
    const numberOfDays = diffDays(event.dates.start, event.dates.end)
    const sessions = useSessions(event)

    if (numberOfDays <= 0) {
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

    const sessionsWithDates = (sessions.data || []).filter((s: Session) => s.dates)

    // TODO : manage callbacks from https://fullcalendar.io/docs/editable
    // TODO change slot height
    // TODO : implement draggable like https://fullcalendar.io/docs/external-dragging-demo
    // Time still in AM/PM even if not displayed

    return (
        <DndProvider backend={HTML5Backend}>
            <FirestoreQueryLoaderAndErrorDisplay hookResult={sessions} />
            <NoDatesSessionsPicker sessions={sessions} updateSession={updateSessionAndRefetch} />
            <Box>
                <FullCalendar
                    schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
                    plugins={[resourceTimeGrid, interactionPlugin]}
                    initialView="resourceTimeGridFourDay"
                    allDaySlot={false}
                    datesAboveResources={true}
                    droppable
                    editable
                    nowIndicator
                    headerToolbar={{
                        left: '',
                        center: '',
                        right: 'prev,next',
                    }}
                    initialDate={event.dates.start?.toISOString()}
                    views={{
                        resourceTimeGridFourDay: {
                            type: 'resourceTimeGrid',
                            duration: { days: numberOfDays },
                            titleFormat: { month: '2-digit', day: '2-digit', weekday: 'long' },
                        },
                    }}
                    slotLabelFormat={{
                        hour: '2-digit',
                        minute: '2-digit',
                        omitZeroMinute: false,
                        meridiem: false,
                    }}
                    slotDuration="00:05:00"
                    slotLabelInterval="00:10"
                    resources={event.tracks.map((t) => ({
                        id: t.id,
                        title: t.name,
                    }))}
                    events={sessionsWithDates.map((s: Session) => ({
                        title: s.title,
                        start: s.dates?.start?.toISO(),
                        end: s.dates?.end?.toISO(),
                        resourceId: s.trackId,
                    }))}
                />
            </Box>
        </DndProvider>
    )
}
