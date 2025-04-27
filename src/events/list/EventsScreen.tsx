import { useState } from 'react'
import { EventsLayout } from './EventsLayout'
import { useEvents } from '../../services/hooks/useEvents'
import { useSelector } from 'react-redux'
import { selectUserIdOpenPlanner } from '../../auth/authReducer'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'
import { EventsListItem } from './EventsListItem'
import { Event } from '../../types'
import { Alert, Box, Button, Link, Typography } from '@mui/material'
import { NewEventCreatedDialog } from '../new/NewEventCreatedDialog'
import { useNotification } from '../../hooks/notificationHook'
import { NewEventDialog } from '../new/NewEventDialog'
import { useIsAdmin } from '../../services/hooks/useIsAdmin'
import { OSSSponsor } from '../../components/OSSSponsor'
export const EventsScreen = ({}) => {
    const userId = useSelector(selectUserIdOpenPlanner)
    const events = useEvents(userId)
    const [newEventOpen, setNewEventOpen] = useState(false)
    const [newEventId, setNewEventId] = useState<null | string>(null)
    const isAdmin = useIsAdmin(userId)

    const { createNotification } = useNotification()

    const onEventCreated = (eventId: string | null) => {
        if (eventId) {
            setNewEventId(eventId)
            createNotification('Event created', { type: 'success' })
        }
        setNewEventOpen(false)
    }

    return (
        <EventsLayout>
            <FirestoreQueryLoaderAndErrorDisplay hookResult={events} />

            <Box component="ul" display="flex" flexWrap="wrap" padding={0}>
                <Box key="new" component="li" marginRight={1} marginBottom={1} sx={{ listStyle: 'none' }}>
                    <Button variant="outlined" size="large" onClick={() => setNewEventOpen(true)}>
                        New event
                    </Button>
                </Box>

                {(events.data || []).map((event: Event) => (
                    <EventsListItem event={event} key={event.id} />
                ))}
            </Box>
            {isAdmin && (
                <Button variant="outlined" size="large" href="/admins">
                    ADMIN
                </Button>
            )}

            <Alert severity="info">
                ConferenceHall integration is now directly managed within ConferenceHall, using OpenPlanner API key.
            </Alert>

            <Box display="flex" flexDirection="column" alignItems="center" gap={1} maxWidth={500} marginX="auto" mt={2}>
                <Typography>
                    This project is open source on{' '}
                    <Link component="a" href="https://github.com/HugoGresse/openplanner" target="_blank">
                        GitHub
                    </Link>
                    . Any support is welcome!
                </Typography>
                <Box width="100%">
                    <OSSSponsor />
                </Box>
            </Box>

            <NewEventDialog isOpen={newEventOpen} onClose={onEventCreated} />

            {newEventId && <NewEventCreatedDialog eventId={newEventId} onClose={() => setNewEventId(null)} />}
        </EventsLayout>
    )
}
