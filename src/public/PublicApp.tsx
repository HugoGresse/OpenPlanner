import { Route, Switch, useRoute } from 'wouter'
import { NestedRoutes } from '../components/NestedRoutes'
import { Typography } from '@mui/material'
import { TranscriptionApp } from './transcription/TranscriptionApp'
import { PublicEventFaqApp } from './faq/PublicEventFaqApp'
import { PublicEvent } from './event/PublicEvent'
import { PublicTalkDetail } from './event/components/PublicTalkDetail'
import { usePublicEvent } from './hooks/usePublicEvent'

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
                <Route path="/talk/:talkId">
                    <PublicTalkWrapper eventId={eventId} />
                </Route>
                <Route path="/schedule/:day">
                    <PublicEvent eventId={eventId} />
                </Route>
                <Route>
                    <PublicEvent eventId={eventId} />
                </Route>
            </Switch>
        </NestedRoutes>
    )
}

type PublicTalkWrapperProps = {
    eventId: string
}

const PublicTalkWrapper = ({ eventId }: PublicTalkWrapperProps) => {
    const event = usePublicEvent(eventId)
    const [_, params] = useRoute('/talk/:talkId')
    const talkId = params?.talkId

    if (event.isLoading || !event.data || !talkId) {
        return <Typography>Loading...</Typography>
    }

    const session = event.data.sessions.find((s) => s.id === talkId)
    if (!session) {
        return <Typography>Talk not found</Typography>
    }

    const sessionWithSpeakers = {
        ...session,
        speakersData: event.data.speakers.filter((speaker) => session.speakerIds.includes(speaker.id)),
    }

    return (
        <PublicTalkDetail
            session={sessionWithSpeakers}
            categories={event.data.event.categories}
            tracks={event.data.event.tracks}
        />
    )
}
