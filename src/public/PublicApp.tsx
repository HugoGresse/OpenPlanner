import { Route, Switch, useRoute } from 'wouter'
import { NestedRoutes } from '../components/NestedRoutes'
import { Typography } from '@mui/material'
import { TranscriptionApp } from './transcription/TranscriptionApp'
import { PublicEventFaqApp } from './faq/PublicEventFaqApp'
import { PublicEvent } from './event/PublicEvent'

export type PublicAppProps = {}
export const PublicApp = (props: PublicAppProps) => {
    const [_, params] = useRoute('/public/event/:eventId/*?')

    const eventId = params?.eventId

    if (!eventId) {
        return <Typography variant="h1">No Event id</Typography>
    }

    return (
        <NestedRoutes base={`/public/event/${params?.eventId}`}>
            <Switch>
                <Route path="/faq">
                    <PublicEventFaqApp eventId={eventId} />
                </Route>
                <Route path="/faq/:privateId">
                    <PublicEventFaqApp eventId={eventId} />
                </Route>
                <Route path="/transcription">
                    <TranscriptionApp eventId={eventId} />
                </Route>

                <Route>
                    <PublicEvent eventId={eventId} />
                </Route>
            </Switch>
        </NestedRoutes>
    )
}
