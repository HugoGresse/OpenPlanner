import * as React from 'react'
import { useRoute } from 'wouter'

export type EventSponsorsProps = {}
export const EventSponsors = (props: EventSponsorsProps) => {
    const [match, params] = useRoute('/events/:eventId')

    return (
        <>
            <div>
                Sponsors!
                {params?.eventId}
            </div>
        </>
    )
}
