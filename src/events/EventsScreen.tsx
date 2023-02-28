import * as React from 'react'
import { EventsLayout } from './EventsLayout'
import { useEvents } from '../services/hooks/useEvents'
import { useSelector } from 'react-redux'
import { selectUserIdConferenceCenter } from '../auth/authReducer'
import { FirestoreQueryLoaderAndErrorDisplay } from '../components/FirestoreQueryLoaderAndErrorDisplay'
import { EventsListItem } from './EventsListItem'
import { Event } from '../types'

export const EventsScreen = ({}) => {
    const userId = useSelector(selectUserIdConferenceCenter)
    const events = useEvents(userId)

    console.log(events)

    return (
        <EventsLayout>
            <FirestoreQueryLoaderAndErrorDisplay hookResult={events} />

            {(events.data || []).map((event: Event) => (
                <EventsListItem event={event} />
            ))}
        </EventsLayout>
    )
}
