import * as React from 'react'
import { lazy, Suspense, useEffect } from 'react'
import { Redirect, Route, Switch, useRoute } from 'wouter'
import { NestedRoutes } from '../../components/NestedRoutes'
import { EventLayout } from './EventLayout'
import { useEvent } from '../../services/hooks/useEvent'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'
import { Event } from '../../types'
import { SuspenseLoader } from '../../components/SuspenseLoader'

import { NewMember } from './team/NewMember'
import { NewSponsor } from './sponsors/NewSponsor'
import { NewSession } from './sessions/NewSession'
import { NewSpeaker } from './speakers/NewSpeaker'

const EventSettings = lazy(() =>
    import('./settings/EventSettings').then((module) => ({ default: module.EventSettings }))
)
const EventAPI = lazy(() => import('./api/Api').then((module) => ({ default: module.API })))
const EventSchedule = lazy(() =>
    import('./schedule/EventSchedule').then((module) => ({ default: module.EventSchedule }))
)
const EventScheduleTemplate = lazy(() =>
    import('./schedule/EventScheduleTemplate').then((module) => ({ default: module.EventScheduleTemplate }))
)
const EventSessions = lazy(() =>
    import('./sessions/list/EventSessions').then((module) => ({ default: module.EventSessions }))
)
const EventSession = lazy(() => import('./sessions/EventSession').then((module) => ({ default: module.EventSession })))
const EventSpeakers = lazy(() =>
    import('./speakers/EventSpeakers').then((module) => ({ default: module.EventSpeakers }))
)
const EventSpeaker = lazy(() => import('./speakers/EventSpeaker').then((module) => ({ default: module.EventSpeaker })))
const EventSponsors = lazy(() =>
    import('./sponsors/EventSponsors').then((module) => ({ default: module.EventSponsors }))
)
const Sponsor = lazy(() => import('./sponsors/Sponsor').then((module) => ({ default: module.Sponsor })))

const EventTeam = lazy(() => import('./team/EventTeam').then((module) => ({ default: module.EventTeam })))
const EventMember = lazy(() => import('./team/EventMember').then((module) => ({ default: module.EventMember })))
const EventFaq = lazy(() => import('./faq/EventFaq').then((module) => ({ default: module.EventFAQ })))

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

    const eventData = event.data as Event
    const defaultRedirect = eventData.dates.start && eventData.tracks.length ? '/schedule' : '/settings'

    return (
        <NestedRoutes base={`/events/${params?.eventId}`}>
            <EventLayout event={eventData}>
                <Route path="/sponsors">
                    <Suspense fallback={<SuspenseLoader />}>
                        <EventSponsors event={eventData} />
                    </Suspense>
                </Route>

                <Switch>
                    <Route path="/sponsors/new">
                        <NewSponsor event={eventData} />
                    </Route>
                    <Route path="/sponsors/:id">
                        <Suspense fallback={<SuspenseLoader />}>
                            <Sponsor event={eventData} />
                        </Suspense>
                    </Route>
                </Switch>

                <Route path="/team">
                    <Suspense fallback={<SuspenseLoader />}>
                        <EventTeam event={eventData} />
                    </Suspense>
                </Route>
                <Switch>
                    <Route path="/team/new">
                        <NewMember event={eventData} />
                    </Route>
                    <Route path="/team/:id">
                        <Suspense fallback={<SuspenseLoader />}>
                            <EventMember event={eventData} />
                        </Suspense>
                    </Route>
                </Switch>
                <Route path="/faq">
                    <Suspense fallback={<SuspenseLoader />}>
                        <EventFaq event={eventData} />
                    </Suspense>
                </Route>

                <Route path="/sessions">
                    <Suspense fallback={<SuspenseLoader />}>
                        <EventSessions event={eventData} />
                    </Suspense>
                </Route>
                <Switch>
                    <Route path="/sessions/new">
                        <NewSession event={eventData} />
                    </Route>
                    <Route path="/sessions/:id">
                        <Suspense fallback={<SuspenseLoader />}>
                            <EventSession event={eventData} />
                        </Suspense>
                    </Route>
                </Switch>

                <Route path="/speakers">
                    <Suspense fallback={<SuspenseLoader />}>
                        <EventSpeakers event={eventData} />
                    </Suspense>
                </Route>
                <Switch>
                    <Route path="/speakers/new">
                        <NewSpeaker event={eventData} />
                    </Route>
                    <Route path="/speakers/:id">
                        <Suspense fallback={<SuspenseLoader />}>
                            <EventSpeaker event={eventData} />
                        </Suspense>
                    </Route>
                </Switch>

                <Route path="/schedule/template">
                    <Suspense fallback={<SuspenseLoader />}>
                        <EventScheduleTemplate event={eventData} />
                    </Suspense>
                </Route>
                <Route path="/schedule">
                    <Suspense fallback={<SuspenseLoader />}>
                        <EventSchedule event={eventData} />
                    </Suspense>
                </Route>
                <Route path="/settings">
                    <Suspense fallback={<SuspenseLoader />}>
                        <EventSettings event={eventData} />
                    </Suspense>
                </Route>
                <Route path="/api">
                    <Suspense fallback={<SuspenseLoader />}>
                        <EventAPI event={eventData} />
                    </Suspense>
                </Route>
                <Route path="/">
                    <Redirect to={defaultRedirect} />
                </Route>
            </EventLayout>
        </NestedRoutes>
    )
}
