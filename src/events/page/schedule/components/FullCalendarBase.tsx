import resourceTimeGrid from '@fullcalendar/resource-timegrid'
import adaptivePlugin from '@fullcalendar/adaptive'
import interactionPlugin, { DropArg, EventResizeDoneArg } from '@fullcalendar/interaction'
import { EventContentArg, EventDropArg, EventSourceInput } from '@fullcalendar/core'
import * as React from 'react'
import FullCalendar from '@fullcalendar/react'
import { Event } from '../../../../types'

type FullCalendarBaseProps = {
    forwardRef?: React.RefObject<any>
    event: Event
    events: EventSourceInput
    daysToDisplay: number
    startTime: string
    customButtons?: Record<string, any>
    drop?: (arg: DropArg) => void
    eventDrop?: (arg: EventDropArg) => void
    eventResize?: (arg: EventResizeDoneArg) => void
    eventContent?: (info: EventContentArg) => React.ReactNode
    datesSet?: (arg: { start: Date; end: Date }) => void
    eventClassNames?: string
}

export const FullCalendarSlotLabelInterval = '00:15'

export const FullCalendarBase = ({
    forwardRef,
    event,
    events,
    startTime,
    daysToDisplay,
    customButtons,
    drop,
    eventDrop,
    eventResize,
    eventContent,
    eventClassNames,
    datesSet,
}: FullCalendarBaseProps) => {
    return (
        <FullCalendar
            ref={forwardRef}
            schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
            plugins={[resourceTimeGrid, interactionPlugin]}
            allDaySlot={false}
            datesAboveResources={true}
            droppable
            editable
            nowIndicator
            headerToolbar={{
                right: 'prev,next',
                left: 'allDays,changeTemplate,exportToExcel',
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
            slotLabelInterval={FullCalendarSlotLabelInterval}
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
            eventClassNames={eventClassNames}
            datesSet={(arg) => {
                if (datesSet) {
                    datesSet(arg)
                }
            }}
        />
    )
}
