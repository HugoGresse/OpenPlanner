import { Box, Button, Card, Dialog, Link, Typography } from '@mui/material'
import * as React from 'react'
import { useRef, useState } from 'react'
import { Event, Session } from '../../../types'
import { useSessions } from '../../../services/hooks/useSessions'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { NoDatesSessionsPicker } from './NoDatesSessionsPicker'
import './eventschedule.css'
import { diffDays, getIndividualDays } from '../../../utils/dates/diffDays'
import { DateTime } from 'luxon'
import { EventSourceInput } from '@fullcalendar/core'
import { onFullCalendarEventChange } from './eventScheduleFunctions'
import { SessionCardContent } from './components/SessionCardContent'
import { useLocation } from 'wouter'
import { FullCalendarBase } from './components/FullCalendarBase'
import { useSessionTemplate } from '../../../services/hooks/useSessionsTemplate'
import { getSessionBackgroundColor } from './components/getSessionBackgroundColor'
import { hexOpacity } from '../../../utils/colors/hexOpacity'
import { hexDarken } from '../../../utils/colors/hexDarken'
import { TemplateCardContent } from './components/TemplateCardContent'
import { downloadOrCopyFullCalendarToExcel } from './components/xlsx/getFullCalendarToExcel'
import { Resource } from '@fullcalendar/resource/internal'
import { useNotification } from '../../../hooks/notificationHook'

export type EventScheduleProps = {
    event: Event
}
export const EventSchedule = ({ event }: EventScheduleProps) => {
    const calendarRef = useRef(null)
    const templateCalendarRef = useRef(null)
    const numberOfDays = diffDays(event.dates.start, event.dates.end)
    const [_, setLocation] = useLocation()
    const sessions = useSessions(event)
    const sessionsTemplate = useSessionTemplate(event)
    const [daysToDisplay, setDaysToDisplay] = useState<number>(1)
    const [exportDialogOpen, setExportDialogOpen] = useState(false)
    const { createNotification } = useNotification()

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

    const hasTemplates = sessionsTemplate.data && sessionsTemplate.data.length > 0

    const sessionsTemplateArray = sessionsTemplate.data || []
    const startTime = DateTime.fromJSDate(event.dates.start).toFormat('HH:mm')

    if (!sessionsWithDates.length) {
        return (
            <Card sx={{ paddingX: 2 }}>
                <Typography fontWeight="600" mt={2}>
                    The event does not have any session with dates.
                </Typography>
                <Button component={Link} href="/sessions">
                    Add a session here
                </Button>
            </Card>
        )
    }

    const customButtons = {
        allDays: {
            text: 'Display all days',
            click: () => {
                const newDaysToDisplay = numberOfDays === daysToDisplay ? 1 : numberOfDays
                setDaysToDisplay(newDaysToDisplay)
                const calendarApi = (templateCalendarRef.current as any).getApi()
                if (calendarApi && event?.dates?.end) {
                    const currentDay = calendarApi.getDate()
                    const lastDayTimestamp = event?.dates?.end?.getTime() || 0
                    const tomorrowDate = new Date(calendarApi.getDate())
                    const diffDays = Math.ceil(
                        Math.abs(event?.dates?.end?.getTime() - currentDay.getTime()) / (1000 * 60 * 60 * 24)
                    )
                    tomorrowDate.setDate(tomorrowDate.getDate() + diffDays)
                    const isThereSomethingTomorrow = lastDayTimestamp > tomorrowDate.getTime()
                    if (!isThereSomethingTomorrow && newDaysToDisplay > daysToDisplay) {
                        // Go to the first event day
                        calendarApi.gotoDate(event?.dates?.start)
                    }
                }
            },
        },
        changeTemplate: {
            text: 'Change template',
            click: () => {
                // Redirect to the template page
                setLocation(`/schedule/template`)
            },
        },
        export: {
            text: 'Export',
            click: () => {
                setExportDialogOpen(true)
            },
        },
    }

    const getExportParameters = (): [Event, EventSourceInput, string, Partial<Resource>[]] => {
        return [
            event,
            sessionsWithDates.map((s: Session) => ({
                title: s.title,
                id: s.id,
                start: s.dates?.start?.toISO(),
                end: s.dates?.end?.toISO(),
                speakers: (s.speakersData || []).map((speaker) => speaker.name).join(', '),
                resourceId: s.trackId,
                extendedProps: s,
                backgroundColor: getSessionBackgroundColor(s),
            })) as EventSourceInput,
            '00:05',
            event.tracks.map((t, index) => ({
                id: t.id,
                title: t.name,
                order: index,
            })),
        ]
    }

    return (
        <>
            <FirestoreQueryLoaderAndErrorDisplay hookResult={sessions} />
            <NoDatesSessionsPicker sessions={sessions} title="Sessions without times:" />
            <Typography variant="caption">Info: The schedule calendar is updated in realtime</Typography>
            <Box paddingBottom={6} position="relative">
                <FullCalendarBase
                    forwardRef={calendarRef}
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
                            backgroundColor: getSessionBackgroundColor(s),
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

                {hasTemplates && (
                    <Box position="absolute" top={0} zIndex={0}>
                        <FullCalendarBase
                            forwardRef={templateCalendarRef}
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
                                    borderColor: hexDarken(getSessionBackgroundColor(template), 10),
                                    backgroundColor: hexOpacity(getSessionBackgroundColor(template), 0.5),
                                    extendedProps: template,
                                }
                            })}
                            eventClassNames="fc-template"
                            eventContent={(info) => {
                                return <TemplateCardContent session={info.event._def.extendedProps as Session} />
                            }}
                            customButtons={customButtons}
                            datesSet={(arg) => {
                                if (calendarRef.current) {
                                    const calendarApi = (calendarRef.current as any).getApi()
                                    if (calendarApi) {
                                        calendarApi.gotoDate(arg.start)
                                    }
                                }
                            }}
                        />
                    </Box>
                )}

                <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
                    <Box sx={{ padding: 2 }}>
                        <Typography variant="h6">Export</Typography>
                        <Button
                            variant={'contained'}
                            sx={{ mt: 1 }}
                            onClick={() => {
                                // @ts-ignore
                                downloadOrCopyFullCalendarToExcel(...getExportParameters(), false)
                            }}>
                            Download Excel/XLSX
                        </Button>

                        <br />

                        {Array.from(Array(numberOfDays).keys()).map((day) => {
                            return (
                                <Button
                                    key={day}
                                    variant="outlined"
                                    sx={{ mt: 1, mr: 1 }}
                                    onClick={() => {
                                        const dayOfTheMonth = getIndividualDays(event.dates.start, event.dates.end)[day]
                                        downloadOrCopyFullCalendarToExcel(
                                            // @ts-ignore
                                            ...getExportParameters(),
                                            true,
                                            dayOfTheMonth.start.toJSDate().getDate()
                                        )
                                        createNotification('Table copied to clipboard')
                                    }}>
                                    Copy table for day {day + 1}
                                </Button>
                            )
                        })}
                        <br />

                        <Button
                            sx={{ mt: 4 }}
                            variant={'contained'}
                            onClick={() => {
                                setExportDialogOpen(false)
                            }}>
                            Close
                        </Button>
                    </Box>
                </Dialog>
            </Box>
        </>
    )
}
