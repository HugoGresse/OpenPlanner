import { Box, Button, Card, Link, Typography } from '@mui/material'
import * as React from 'react'
import { useState } from 'react'
import { Event, Session } from '../../../types'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { NoDatesSessionsPicker } from './NoDatesSessionsPicker'
import './eventschedule.css'
import { diffDays } from '../../../utils/dates/diffDays'
import { DateTime } from 'luxon'
import { onFullCalendarEventChange } from './eventScheduleFunctions'
import { DEFAULT_SESSION_CARD_BACKGROUND_COLOR } from './scheduleConstants'
import { FullCalendarBase } from './components/FullCalendarBase'
import { useSessionTemplate } from '../../../services/hooks/useSessionsTemplate'
import { TemplateDialog } from './components/TemplateDialog'
import { updateSessionTemplate } from '../../actions/sessions/updateSessionTemplate'
import { ArrowBack } from '@mui/icons-material'
import { TemplateCardContent } from './components/TemplateCardContent'
import { useFirestoreDocumentDeletion } from '../../../services/hooks/firestoreMutationHooks'
import { collections } from '../../../services/firebase'

export type EventScheduleTemplateProps = {
    event: Event
}
export const EventScheduleTemplate = ({ event }: EventScheduleTemplateProps) => {
    const numberOfDays = diffDays(event.dates.start, event.dates.end)
    const sessionsTemplate = useSessionTemplate(event)
    const [daysToDisplay, setDaysToDisplay] = useState<number>(1)
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false)

    const deleteMutation = useFirestoreDocumentDeletion(collections.sessionsTemplate(event.id))

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

    const sessionsArray = sessionsTemplate.data || []
    const sessionsWithDates = sessionsArray.filter((s: Session) => s.dates)

    const startTime = DateTime.fromJSDate(event.dates.start).toFormat('HH:mm')

    const customButtons = {
        allDays: {
            text: 'Display all days',
            click: () => {
                setDaysToDisplay(numberOfDays === daysToDisplay ? 1 : numberOfDays)
            },
        },
        changeTemplate: {
            text: 'Change template config',
            click: () => {
                setTemplateDialogOpen(true)
            },
        },
    }

    return (
        <Box padding={5}>
            <Box display="flex" justifyContent="space-between">
                <Button href="/schedule" startIcon={<ArrowBack />}>
                    SCHEDULE
                </Button>
                <Typography variant="h3">Schedule template</Typography>
                <Box></Box>
            </Box>
            <FirestoreQueryLoaderAndErrorDisplay hookResult={sessionsTemplate} />
            <NoDatesSessionsPicker sessions={sessionsTemplate} title="Not placed template" />
            <FullCalendarBase
                event={event}
                daysToDisplay={daysToDisplay}
                startTime={startTime}
                events={sessionsWithDates.map((template) => {
                    return {
                        title: template.title,
                        id: template.id,
                        start: template.dates?.start?.toISO() || undefined,
                        end: template.dates?.end?.toISO() || undefined,
                        resourceId: template.trackId || undefined,
                        backgroundColor: template.categoryObject?.color || DEFAULT_SESSION_CARD_BACKGROUND_COLOR,
                        extendedProps: template,
                    }
                })}
                eventContent={(info) => {
                    return (
                        <TemplateCardContent
                            session={info.event._def.extendedProps as Session}
                            onDelete={async () => {
                                await deleteMutation.mutate(info.event._def.extendedProps.id)
                            }}
                        />
                    )
                }}
                customButtons={customButtons}
                drop={(info) => {
                    const sessionId = info.draggedEl.getAttribute('data-id')
                    const trackId = info.resource?.id

                    onFullCalendarEventChange(
                        event.id,
                        sessionsTemplate,
                        sessionId,
                        trackId,
                        info.date,
                        null,
                        updateSessionTemplate
                    )
                }}
                eventDrop={(info) => {
                    const sessionId = info.event._def.publicId
                    const trackId = info.event._def.resourceIds ? info.event._def.resourceIds[0] : undefined

                    onFullCalendarEventChange(
                        event.id,
                        sessionsTemplate,
                        sessionId,
                        trackId,
                        info.event.start,
                        info.event.end,
                        updateSessionTemplate
                    )
                }}
                eventResize={(info) => {
                    const sessionId = info.event._def.publicId
                    const trackId = info.event._def.resourceIds ? info.event._def.resourceIds[0] : undefined

                    onFullCalendarEventChange(
                        event.id,
                        sessionsTemplate,
                        sessionId,
                        trackId,
                        info.event.start,
                        info.event.end,
                        updateSessionTemplate
                    )
                }}
            />

            {templateDialogOpen && (
                <TemplateDialog
                    event={event}
                    isOpen={templateDialogOpen}
                    onClose={() => setTemplateDialogOpen(false)}
                />
            )}
        </Box>
    )
}
