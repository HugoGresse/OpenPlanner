import * as React from 'react'
import { useEffect } from 'react'
import { Redirect, Route, Switch, useRoute } from 'wouter'
import { NestedRoutes } from '../../components/NestedRoutes'
import { EventLayout } from './EventLayout'
import { useEvent } from '../../services/hooks/useEvent'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'
import { EventSponsors } from './sponsors/EventSponsors'
import { EventSettings } from './settings/EventSettings'
import { Event } from '../../types'
import { EventSchedule } from './schedule/EventSchedule'
import { EventSessions } from './sessions/list/EventSessions'
import { EventSession } from './sessions/EventSession'
import { EventSpeakers } from './speakers/EventSpeakers'
import { EventSpeaker } from './speakers/EventSpeaker'
import { NewSession } from './sessions/NewSession'
import { NewSpeaker } from './speakers/NewSpeaker'
import { NewSponsor } from './sponsors/NewSponsor'
import { Sponsor } from './sponsors/Sponsor'

export const EventRouter = () => {
    const [_, params] = useRoute('/events/:eventId/:subRoute*')
    const event = useEvent(params?.eventId)

    useEffect(() => {
        document.title = `OpenPlanner | ${event.data?.name}`
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

    const eventData = event.data as Event
    const defaultRedirect = eventData.dates.start && eventData.tracks.length ? '/schedule' : '/settings'

    return (
        <NestedRoutes base={`/events/${params?.eventId}`}>
            <EventLayout event={eventData} eventUpdated={eventUpdated}>
                <Route path="/sponsors">
                    <EventSponsors event={eventData} />
                </Route>

                <Switch>
                    <Route path="/sponsors/new">
                        <NewSponsor event={eventData} />
                    </Route>
                    <Route path="/sponsors/:id">
                        <Sponsor event={eventData} />
                    </Route>
                </Switch>

                <Route path="/sessions">
                    <EventSessions event={eventData} />
                </Route>
                <Switch>
                    <Route path="/sessions/new">
                        <NewSession event={eventData} />
                    </Route>
                    <Route path="/sessions/:id">
                        <EventSession event={eventData} />
                    </Route>
                </Switch>

                <Route path="/speakers">
                    <EventSpeakers event={eventData} eventUpdated={eventUpdated} />
                </Route>
                <Route path="/speakers/new">
                    <NewSpeaker event={eventData} />
                </Route>
                <Route path="/speakers/:id">
                    <EventSpeaker event={eventData} />
                </Route>
                <Route path="/schedule">
                    <EventSchedule event={eventData} />
                </Route>
                <Route path="/settings">
                    <EventSettings event={eventData} eventUpdated={eventUpdated} />
                </Route>
                <Route path="/">
                    <Redirect to={defaultRedirect} />
                </Route>
            </EventLayout>
        </NestedRoutes>
    )
}
