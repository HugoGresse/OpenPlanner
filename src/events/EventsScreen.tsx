import * as React from 'react'
import { useState } from 'react'
import { EventsLayout } from './EventsLayout'
import { useEvents } from '../services/hooks/useEvents'
import { useSelector } from 'react-redux'
import { selectUserIdConferenceCenter } from '../auth/authReducer'
import { FirestoreQueryLoaderAndErrorDisplay } from '../components/FirestoreQueryLoaderAndErrorDisplay'
import { EventsListItem } from './EventsListItem'
import { Event } from '../types'
import { Box, Button } from '@mui/material'
import { NewEventDialog } from './NewEventDialog'

export const EventsScreen = ({}) => {
    const userId = useSelector(selectUserIdConferenceCenter)
    const events = useEvents(userId)
    const [newEventOpen, setNewEventOpen] = useState(false)

    return (
        <EventsLayout>
            <FirestoreQueryLoaderAndErrorDisplay hookResult={events} />

            <Box component="ul" display="flex" flexWrap="wrap" padding={0}>
                <Box key="import" component="li" marginRight={1} marginBottom={1} sx={{ listStyle: 'none' }}>
                    <Button variant="outlined" size="large" onClick={() => setNewEventOpen(true)}>
                        Import from Conference Center
                    </Button>
                </Box>

                {(events.data || []).map((event: Event) => (
                    <EventsListItem event={event} key={event.id} />
                ))}
            </Box>

            <NewEventDialog isOpen={newEventOpen} onClose={() => setNewEventOpen(false)} />
        </EventsLayout>
    )
}
