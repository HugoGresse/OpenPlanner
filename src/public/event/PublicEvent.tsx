import { Box } from '@mui/material'
import { PublicEventLayout } from '../PublicEventLayout'
import { usePublicEvent } from '../hooks/usePublicEvent'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'
import { DateTime } from 'luxon'
import { useLocation, useRoute } from 'wouter'
import { PublicEventSchedule } from './PublicEventSchedule'
import { useEffect } from 'react'

export type PublicEventProps = {
    eventId: string
}

export const PublicEvent = ({ eventId }: PublicEventProps) => {
    const event = usePublicEvent(eventId)
    const [_, setLocation] = useLocation()
    const [_2, params] = useRoute('/schedule/:day')

    useEffect(() => {
        if (!event.isLoading && event.data && !params?.day) {
            const firstDay = event.data.sessions
                .map((s) => s.dateStart)
                .filter((date): date is string => !!date)
                .sort()[0]

            if (firstDay) {
                const formattedDay = DateTime.fromISO(firstDay).toFormat('yyyy-MM-dd')
                setLocation(`/schedule/${formattedDay}`)
            }
        }
    }, [event.isLoading, event.data, eventId, params?.day])

    if (event.isLoading || !event.data) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <FirestoreQueryLoaderAndErrorDisplay hookResult={event} />
            </Box>
        )
    }

    return (
        <PublicEventLayout>
            <PublicEventSchedule eventId={eventId} event={event.data} />
        </PublicEventLayout>
    )
}
