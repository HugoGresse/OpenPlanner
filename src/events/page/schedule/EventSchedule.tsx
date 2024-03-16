import { Box, Button, Card, Link, Typography } from '@mui/material'
import * as React from 'react'
import { useState } from 'react'
import { Event, Session } from '../../../types'
import { useSessions } from '../../../services/hooks/useSessions'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { NoDatesSessionsPicker } from './NoDatesSessionsPicker'
import './eventschedule.css'
import { diffDays } from '../../../utils/dates/diffDays'
import { DateTime } from 'luxon'
import { EventSourceInput } from '@fullcalendar/core'
import { onFullCalendarEventChange } from './eventScheduleFunctions'
import { DEFAULT_SESSION_CARD_BACKGROUND_COLOR } from './scheduleConstants'
import { SessionCardContent } from './components/SessionCardContent'
import { useLocation } from 'wouter'
import { FullCalendarBase } from './components/FullCalendarBase'
import { useSessionTemplate } from '../../../services/hooks/useSessionsTemplate'
import { TemplateDialog } from './components/TemplateDialog'

export type EventScheduleProps = {
    event: Event
}
export const EventSchedule = ({ event }: EventScheduleProps) => {
    const numberOfDays = diffDays(event.dates.start, event.dates.end)
    const [_, setLocation] = useLocation()
    const sessions = useSessions(event)
    const sessionsTemplate = useSessionTemplate(event)
    const [daysToDisplay, setDaysToDisplay] = useState<number>(1)
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false)

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

    const sessionsTemplateArray = sessionsTemplate.data || []
    const startTime = DateTime.fromJSDate(event.dates.start).toFormat('HH:mm')

    const customButtons = {
        allDays: {
            text: 'Display all days',
            click: () => {
                setDaysToDisplay(numberOfDays === daysToDisplay ? 1 : numberOfDays)
            },
        },
        changeTemplate: {
            text: 'Change template',
            click: () => {
                setTemplateDialogOpen(true)
            },
        },
    }

    return (
        <>
            <FirestoreQueryLoaderAndErrorDisplay hookResult={sessions} />
            <NoDatesSessionsPicker sessions={sessions} />
            <Typography variant="caption">Info: The schedule calendar is updated in realtime</Typography>
            <Box paddingBottom={6} position="relative">
                <Box position="absolute" top={0}>
                    <FullCalendarBase
                        event={event}
                        daysToDisplay={daysToDisplay}
                        startTime={startTime}
                        events={sessionsTemplateArray.map((template) => {
                            return {
                                title: template.title,
                                id: template.id,
                                start: template.dates?.start?.toISO() || undefined,
                                end: template.dates?.end?.toISO() || undefined,
                                resourceId: template.trackId || undefined,
                                backgroundColor: DEFAULT_SESSION_CARD_BACKGROUND_COLOR,
                                extendedProps: template,
                            }
                        })}
                        eventContent={(info) => {
                            return <SessionCardContent session={info.event._def.extendedProps as Session} />
                        }}
                        customButtons={customButtons}
                    />
                </Box>
                <FullCalendarBase
                    startTime={startTime}
                    daysToDisplay={daysToDisplay}
                    event={event}
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
                    customButtons={customButtons}
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

            {templateDialogOpen && (
                <TemplateDialog
                    event={event}
                    isOpen={templateDialogOpen}
                    onClose={() => setTemplateDialogOpen(false)}
                />
            )}
        </>
    )
}
