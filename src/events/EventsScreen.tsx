import * as React from 'react'
import { useAppDispatch } from '../reduxStore'
import { EventsLayout } from './EventsLayout'

export const EventsScreen = ({}) => {
    const dispatch = useAppDispatch()
    return (
        <EventsLayout>
            <>Events</>
        </EventsLayout>
    )
}
