import { useRoute } from 'wouter'
import { NestedRoutes } from '../../components/NestedRoutes'
import { EventApp } from './EventApp'

export const EventRouter = () => {
    const [_, params] = useRoute('/events/:eventId/*?')

    return (
        <NestedRoutes base={`/events/${params?.eventId}`}>
            <EventApp eventId={params?.eventId} />
        </NestedRoutes>
    )
}
