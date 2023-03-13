import * as React from 'react'
import { useEffect } from 'react'
import { Redirect, Route, useRoute } from 'wouter'
import { NestedRoutes } from '../../components/NestedRoutes'
import { EventLayout } from './EventLayout'
import { useEvent } from '../../services/hooks/useEvent'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'
import { EventSponsors } from './EventSponsors'
import { EventSettings } from './settings/EventSettings'
import { Event } from '../../types'
import { EventSchedule } from './schedule/EventSchedule'
import { EventSessions } from './sessions/EventSessions'

export const EventRouter = () => {
    const [_, params] = useRoute('/events/:eventId/:subRoute*')
    const event = useEvent(params?.eventId)

    useEffect(() => {
        document.title = `ConferenceCenter | ${event.data?.name}`
    }, [params])

    if (event.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={event} />
    }

    if (!event.data) {
        return <>Error? {JSON.stringify(event, null, 4)}</>
    }

    const eventUpdated = async () => {
        return event.refetch()
    }

    return (
        <NestedRoutes base={`/events/${params?.eventId}`}>
            <EventLayout>
                <Route path="/sponsors">
                    <EventSponsors />
                </Route>
                <Route path="/sessions">
                    <EventSessions event={event.data as Event} eventUpdated={eventUpdated} />
                </Route>
                <Route path="/speakers">
                    <>speakers</>
                </Route>
                <Route path="/schedule">
                    <EventSchedule event={event.data as Event} />
                </Route>
                <Route path="/settings">
                    <EventSettings event={event.data as Event} eventUpdated={eventUpdated} />
                </Route>
                <Route path="/">
                    <Redirect to="/settings" />
                </Route>
            </EventLayout>
        </NestedRoutes>
    )
}
