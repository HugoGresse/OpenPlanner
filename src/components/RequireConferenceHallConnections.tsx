import * as React from 'react'
import { Event } from '../types'

export type RequireConferenceHallConnectionsProps = {
    event: Event
    children: React.ReactNode
}
export const RequireConferenceHallConnections = ({ event, children }: RequireConferenceHallConnectionsProps) => {
    if (event.conferenceHallId) {
        return <>{children}</>
    }
    return null
}
