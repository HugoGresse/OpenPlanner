import * as React from 'react'
import { useEffect } from 'react'
import { Route, Switch, useRoute } from 'wouter'
import { NestedRoutes } from '../components/NestedRoutes'
import { usePublicEvent } from './hooks/usePublicEvent'
import { PublicEventFaq } from './faq/PublicEventFaq'
import { FirestoreQueryLoaderAndErrorDisplay } from '../components/FirestoreQueryLoaderAndErrorDisplay'
import { Box, Typography } from '@mui/material'

export type PublicAppProps = {}
export const PublicApp = (props: PublicAppProps) => {
    const [_, params] = useRoute('/public/event/:eventId/:subRoute/:privateId*')

    const publicEvent = usePublicEvent(params?.eventId, params?.privateId)

    useEffect(() => {
        document.title = `FAQ | ${publicEvent.data ? publicEvent.data.eventName : ''}`
    }, [params])

    if (publicEvent.isLoading || !publicEvent.data) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <FirestoreQueryLoaderAndErrorDisplay hookResult={publicEvent} />
            </Box>
        )
    }

    const publicEventData = publicEvent.data

    return (
        <NestedRoutes base={`/public/event/${params?.eventId}`}>
            <Switch>
                <Route path="/faq">
                    <PublicEventFaq faqReply={publicEventData} />
                </Route>
                <Route path="/faq/:privateId">
                    <PublicEventFaq faqReply={publicEventData} />
                </Route>

                <Route>
                    <Typography variant="h1">Not implemented!</Typography>
                </Route>
            </Switch>
        </NestedRoutes>
    )
}
