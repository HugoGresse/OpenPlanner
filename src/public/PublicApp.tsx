import * as React from 'react'
import { useEffect } from 'react'
import { Route, Switch, useRoute } from 'wouter'
import { NestedRoutes } from '../components/NestedRoutes'
import { usePublicEvent } from './hooks/usePublicEvent'
import { PublicEventFaq } from './faq/PublicEventFaq'
import { FirestoreQueryLoaderAndErrorDisplay } from '../components/FirestoreQueryLoaderAndErrorDisplay'
import { Typography } from '@mui/material'

export type PublicAppProps = {}
export const PublicApp = (props: PublicAppProps) => {
    const [_, params] = useRoute('/public/:eventId/:subRoute*')

    const publicEvent = usePublicEvent(params?.eventId)

    useEffect(() => {
        document.title = `FAQ | ${publicEvent.data ? publicEvent.data.eventName : ''}`
    }, [params])

    if (publicEvent.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={publicEvent} />
    }

    if (!publicEvent.data) {
        return <>Error? {JSON.stringify(publicEvent, null, 4)}</>
    }

    const publicEventData = publicEvent.data

    return (
        <NestedRoutes base={`/public/${params?.eventId}`}>
            <Switch>
                <Route path="/faq">
                    <PublicEventFaq faqReply={publicEventData} />
                </Route>

                <Route>
                    <Typography variant="h1">Not implemented!</Typography>
                </Route>
            </Switch>
        </NestedRoutes>
    )
}
