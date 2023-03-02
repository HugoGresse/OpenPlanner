import * as React from 'react'
import { useRoute } from 'wouter'

export type EventSponsorsProps = {}
export const EventSponsors = (props: EventSponsorsProps) => {
    const [match, params] = useRoute('/events/:eventId')

    console.log('render sponsors')

    return (
        <>
            <div>Sponsors!</div>
        </>
    )
}
