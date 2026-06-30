import { Suspense } from 'react'
import { Route, Switch, useRoute } from 'wouter'
import { NestedRoutes } from '../components/NestedRoutes'
import { Typography } from '@mui/material'
import { SuspenseLoader } from '../components/SuspenseLoader'
import { lazyWithRetry } from '../components/lazyWithRetry'
import { IntermissionApp } from './intermission/IntermissionApp'
import { PublicEventFaqApp } from './faq/PublicEventFaqApp'
import { PublicEventContainer } from './event/PublicEventContainer'
import { PublicEventJobAdd } from './jobs/PublicEventJobAdd'
import { PublicEventJobManagement } from './jobs/PublicEventJobManagement'
import { PublicSpeakerEditRequest } from './speakerEdit/PublicSpeakerEditRequest'
import { PublicSpeakerEditForm } from './speakerEdit/PublicSpeakerEditForm'

// Lazy-loaded so the live-transcription stack (@gladiaio/sdk, react-colorful, AudioWorklet) only ships
// to people opening /transcription, not every public or admin page.
const TranscriptionApp = lazyWithRetry(() =>
    import('./transcription/TranscriptionApp').then((module) => ({ default: module.TranscriptionApp }))
)

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
                    <Suspense fallback={<SuspenseLoader />}>
                        <TranscriptionApp eventId={eventId} />
                    </Suspense>
                </Route>
                <Route path="/intermission">
                    <IntermissionApp eventId={eventId} />
                </Route>
                <Route path="/jobs/add">
                    <PublicEventJobAdd eventId={eventId} />
                </Route>
                <Route path="/jobsSponsors/">
                    <PublicEventJobManagement eventId={eventId} />
                </Route>
                <Route path="/speaker-edit">
                    <PublicSpeakerEditRequest eventId={eventId} />
                </Route>
                <Route path="/speaker-edit/:speakerId">
                    {(params) => <PublicSpeakerEditForm eventId={eventId} speakerId={params.speakerId} />}
                </Route>
                <Route>
                    <PublicEventContainer eventId={eventId} />
                </Route>
            </Switch>
        </NestedRoutes>
    )
}
