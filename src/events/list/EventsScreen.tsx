import { useMemo, useState } from 'react'
import { EventsLayout } from './EventsLayout'
import { useEvents } from '../../services/hooks/useEvents'
import { useSelector } from 'react-redux'
import { selectUserIdOpenPlanner } from '../../auth/authReducer'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'
import { EventsListItem } from './EventsListItem'
import { Event } from '../../types'
import { Alert, Box, Button, Chip, Divider, Grid, Link, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { NewEventCreatedDialog } from '../new/NewEventCreatedDialog'
import { useNotification } from '../../hooks/notificationHook'
import { NewEventDialog } from '../new/NewEventDialog'
import { useIsAdmin } from '../../services/hooks/useIsAdmin'
import { OSSSponsor } from '../../components/OSSSponsor'
import { EVENT_CATEGORY_LABEL, EVENT_CATEGORY_ORDER, groupEventsByCategory } from './categorizeEvents'

export const EventsScreen = ({}) => {
    const userId = useSelector(selectUserIdOpenPlanner)
    const events = useEvents(userId)
    const [newEventOpen, setNewEventOpen] = useState(false)
    const [newEventId, setNewEventId] = useState<null | string>(null)
    const isAdmin = useIsAdmin(userId)

    const { createNotification } = useNotification()

    const groupedEvents = useMemo(() => groupEventsByCategory((events.data || []) as Event[]), [events.data])
    const totalEvents = (events.data || []).length

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

            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
                <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => setNewEventOpen(true)}>
                    New event
                </Button>
                {isAdmin && (
                    <Button variant="outlined" size="large" href="/admins">
                        Admin
                    </Button>
                )}
            </Stack>

            {totalEvents === 0 && !events.isLoading && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    You don't have any event yet. Create one to get started.
                </Alert>
            )}

            {EVENT_CATEGORY_ORDER.map((category) => {
                const list = groupedEvents[category]
                if (!list.length) return null
                return (
                    <Box key={category} sx={{ mb: 4 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                            <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                                {EVENT_CATEGORY_LABEL[category]}
                            </Typography>
                            <Chip label={list.length} size="small" />
                        </Stack>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={2}>
                            {list.map((event) => (
                                <Grid item xs={12} sm={6} md={6} key={event.id}>
                                    <EventsListItem event={event} />
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )
            })}

            <Box display="flex" flexDirection="column" alignItems="center" gap={1} maxWidth={500} marginX="auto" mt={4}>
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
