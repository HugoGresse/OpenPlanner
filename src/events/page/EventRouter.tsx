import * as React from 'react'
import { useEffect } from 'react'
import { useRoute } from 'wouter'
import { useEvent } from '../../services/hooks/useEvent'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'

export const EventRouter = () => {
    const [_, params] = useRoute('/events/:eventId/:subRoute*')
    const event = useEvent(params?.eventId)

    useEffect(() => {
        document.title = `ConferenceCenter | ${event.data?.name}`
    }, [params])

    if (event.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={event} />
    }

    console.log('render routes')

    return null
}
