import * as React from 'react'
import { useEffect } from 'react'
import { Redirect, Route, useRoute } from 'wouter'
import { NestedRoutes } from '../../components/NestedRoutes'
import { EventLayout } from './EventLayout'
import { useEvent } from '../../services/hooks/useEvent'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'
import { EventSponsors } from './EventSponsors'

export const EventRouter = () => {
    const [_, params] = useRoute('/events/:eventId/:subRoute*')
    const event = useEvent(params?.eventId)

    useEffect(() => {
        document.title = `ConferenceCenter | ${event.data?.name}`
    }, [params])

    if (event.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={event} />
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
                    <>settings</>
                </Route>
                <Route path="/">
                    <Redirect to="/sponsors" />
                </Route>
            </EventLayout>
        </NestedRoutes>
    )
}
