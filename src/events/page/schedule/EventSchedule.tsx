import { Box, Button, Card, Link, Typography } from '@mui/material'
import * as React from 'react'
import { useState } from 'react'
import { Event, Session } from '../../../types'
import { useSessions } from '../../../services/hooks/useSessions'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { NoDatesSessionsPicker } from './NoDatesSessionsPicker'
import FullCalendar from '@fullcalendar/react'
import resourceTimeGrid from '@fullcalendar/resource-timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import './eventschedule.css'
import { diffDays } from '../../../utils/dates/diffDays'
import { DateTime } from 'luxon'
import { EventSourceInput } from '@fullcalendar/core'
import { onFullCalendarEventChange } from './eventScheduleFunctions'
import { DEFAULT_SESSION_CARD_BACKGROUND_COLOR } from './scheduleConstants'
import { SessionCardContent } from './components/SessionCardContent'
import { useLocation } from 'wouter'

export type EventScheduleProps = {
    event: Event
}
export const EventSchedule = ({ event }: EventScheduleProps) => {
    const numberOfDays = diffDays(event.dates.start, event.dates.end)
    const [_, setLocation] = useLocation()
    const sessions = useSessions(event)
    const [daysToDisplay, setDaysToDisplay] = useState<number>(1)

    if (numberOfDays <= 0 || !event.dates.start || !event.dates.end) {
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

    const sessionsArray = sessions.data || []
    const sessionsWithDates = sessionsArray.filter((s: Session) => s.dates)

    const startTime = DateTime.fromJSDate(event.dates.start).toFormat('HH:mm')

    return (
        <>
            <FirestoreQueryLoaderAndErrorDisplay hookResult={sessions} />
            <NoDatesSessionsPicker sessions={sessions} />
            <Box paddingBottom={6}>
                <FullCalendar
                    schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
                    plugins={[resourceTimeGrid, interactionPlugin]}
                    allDaySlot={false}
                    datesAboveResources={true}
                    droppable
                    editable
                    nowIndicator
                    headerToolbar={{
                        right: 'prev,next',
                        left: 'allDays',
                        center: 'title',
                    }}
                    customButtons={{
                        allDays: {
                            text: 'Display all days',
                            click: () => {
                                setDaysToDisplay(numberOfDays === daysToDisplay ? 1 : numberOfDays)
                            },
                        },
                    }}
                    initialView="resourceTimeGridFourDay"
                    initialDate={event.dates.start.toISOString()}
                    validRange={{
                        start: event.dates.start.toISOString(),
                        end: event.dates.end.toISOString(),
                    }}
                    views={{
                        resourceTimeGridFourDay: {
                            type: 'resourceTimeGrid',
                            duration: { days: daysToDisplay },
                        },
                    }}
                    slotMinTime={startTime}
                    slotLabelFormat={{
                        hour: '2-digit',
                        minute: '2-digit',
                    }}
                    locale={'fr'}
                    slotDuration="00:05:00"
                    slotLabelInterval="00:15"
                    height="auto"
                    resourceOrder="order"
                    resources={event.tracks.map((t, index) => ({
                        id: t.id,
                        title: t.name,
                        order: index,
                    }))}
                    events={
                        sessionsWithDates.map((s: Session) => ({
                            title: s.title,
                            id: s.id,
                            start: s.dates?.start?.toISO(),
                            end: s.dates?.end?.toISO(),
                            resourceId: s.trackId,
                            extendedProps: s,
                            backgroundColor: s.categoryObject?.color || DEFAULT_SESSION_CARD_BACKGROUND_COLOR,
                        })) as EventSourceInput
                    }
                    eventContent={(info) => {
                        return (
                            <SessionCardContent
                                session={info.event._def.extendedProps as Session}
                                setLocation={setLocation}
                            />
                        )
                    }}
                    drop={(info) => {
                        const sessionId = info.draggedEl.getAttribute('data-id')
                        const trackId = info.resource?.id

                        onFullCalendarEventChange(event.id, sessions, sessionId, trackId, info.date, null)
                    }}
                    eventDrop={(info) => {
                        const sessionId = info.event._def.publicId
                        const trackId = info.event._def.resourceIds ? info.event._def.resourceIds[0] : undefined

                        onFullCalendarEventChange(
                            event.id,
                            sessions,
                            sessionId,
                            trackId,
                            info.event.start,
                            info.event.end
                        )
                    }}
                    eventResize={(info) => {
                        const sessionId = info.event._def.publicId
                        const trackId = info.event._def.resourceIds ? info.event._def.resourceIds[0] : undefined

                        onFullCalendarEventChange(
                            event.id,
                            sessions,
                            sessionId,
                            trackId,
                            info.event.start,
                            info.event.end
                        )
                    }}
                />
            </Box>
        </>
    )
}
