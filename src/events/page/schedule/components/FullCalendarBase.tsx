import resourceTimeGrid from '@fullcalendar/resource-timegrid'
import interactionPlugin, { DropArg, EventResizeDoneArg } from '@fullcalendar/interaction'
import { EventContentArg, EventDropArg, EventSourceInput } from '@fullcalendar/core'
import * as React from 'react'
import FullCalendar from '@fullcalendar/react'
import { Event } from '../../../../types'

type FullCalendarBaseProps = {
    event: Event
    events: EventSourceInput
    daysToDisplay: number
    startTime: string
    customButtons?: Record<string, any>
    drop?: (arg: DropArg) => void
    eventDrop?: (arg: EventDropArg) => void
    eventResize?: (arg: EventResizeDoneArg) => void
    eventContent?: (info: EventContentArg) => React.ReactNode
}

export const FullCalendarBase = ({
    event,
    events,
    startTime,
    daysToDisplay,
    customButtons,
    drop,
    eventDrop,
    eventResize,
    eventContent,
}: FullCalendarBaseProps) => {
    return (
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
                left: 'allDays, changeTemplate',
                center: 'title',
            }}
            customButtons={customButtons}
            initialView="resourceTimeGridFourDay"
            initialDate={event.dates.start?.toISOString()}
            validRange={{
                start: event.dates.start?.toISOString(),
                end: event.dates.end?.toISOString(),
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
            locale="fr"
            slotDuration="00:05:00"
            slotLabelInterval="00:15"
            height="auto"
            resourceOrder="order"
            resources={event.tracks.map((t, index) => ({
                id: t.id,
                title: t.name,
                order: index,
            }))}
            events={events}
            eventContent={eventContent}
            drop={drop}
            eventDrop={eventDrop}
            eventResize={eventResize}
        />
    )
}
