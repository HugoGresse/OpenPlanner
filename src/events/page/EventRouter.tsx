import * as React from 'react'
import { useEffect } from 'react'
import { Redirect, Route, useRoute } from 'wouter'
import { NestedRoutes } from '../../components/NestedRoutes'
import { EventLayout } from './EventLayout'
import { useEvent } from '../../services/hooks/useEvent'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'
import { EventSponsors } from './EventSponsors'
import { EventSettings } from './EventSettings'
import { Event } from '../../types'

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

    return (
        <NestedRoutes base={`/events/${params?.eventId}`}>
            <EventLayout>
                <Route path="/sponsors">
                    <EventSponsors />
                </Route>
                <Route path="/sessions">
                    <>sessions</>
                </Route>
                <Route path="/speakers">
                    <>speakers</>
                </Route>
                <Route path="/schedule">
                    <>schedule</>
                </Route>
                <Route path="/settings">
                    <EventSettings event={event.data as Event} />
                </Route>
                <Route path="/">
                    <Redirect to="/sponsors" />
                </Route>
            </EventLayout>
        </NestedRoutes>
    )
}
