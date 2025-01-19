import { useLocation, useRoute } from 'wouter'
import { DateTime } from 'luxon'
import { PublicEventSchedule } from './PublicEventSchedule'
import { useEffect } from 'react'
import { JsonPublicOutput } from '../../events/actions/updateWebsiteActions/jsonTypes'

export type PublicEventProps = {
    eventId: string
    event: JsonPublicOutput
}

export const PublicEvent = ({ eventId, event }: PublicEventProps) => {
    const [_, setLocation] = useLocation()
    const [_2, params] = useRoute('/schedule/:day')

    useEffect(() => {
        if (!params?.day) {
            const firstDay = event.sessions
                .map((s) => s.dateStart)
                .filter((date): date is string => !!date)
                .sort()[0]

            if (firstDay) {
                const formattedDay = DateTime.fromISO(firstDay).toFormat('yyyy-MM-dd')
                setLocation(`/schedule/${formattedDay}`)
            }
        }
    }, [event.sessions, params?.day, setLocation])

    return <PublicEventSchedule eventId={eventId} event={event} />
}
