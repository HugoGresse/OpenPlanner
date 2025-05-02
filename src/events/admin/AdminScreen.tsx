import * as React from 'react'
import { useSelector } from 'react-redux'
import { selectUserIdOpenPlanner } from '../../auth/authReducer'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'
import { Box, Button, Container, Typography } from '@mui/material'
import { useIsAdmin } from '../../services/hooks/useIsAdmin'
import { useAdminEvents } from '../../services/hooks/useAdminEvents'
import { DataGrid } from '@mui/x-data-grid'
import { DateTime } from 'luxon'
import { EventLayoutAuthUser } from '../list/EventLayoutAuthUser'
import { collections } from '../../services/firebase'
import { useFirestoreCollection } from '../../services/hooks/firestoreQueryHook'
import { useMemo } from 'react'

export const AdminScreen = ({}) => {
    const userId = useSelector(selectUserIdOpenPlanner)
    const events = useAdminEvents()
    const isAdmin = useIsAdmin(userId)

    const eventsAsRow = useMemo(() => {
        if (!events.data) return []

        return events.data.map((event: any) => {
            // For each event, we need to fetch speaker and session counts
            // But we can't directly use useEventStats in the loop
            // Instead, we'll fetch counts when rendering the row directly
            return {
                id: event.id,
                createdAt: event.createdAt.toDate().toLocaleString(),
                name: event.name,
                happenAt: DateTime.fromJSDate(event.dates.start).toRelative(),
                eventId: event.id, // Save event ID for the custom component
            }
        })
    }, [events.data])

    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'createdAt', headerName: 'Created At', width: 200 },
        { field: 'name', headerName: 'Name', width: 200 },
        { field: 'happenAt', headerName: 'Event Date', width: 200 },
        {
            field: 'speakersCount',
            headerName: 'Speakers',
            width: 100,
            renderCell: (params: any) => <EventStatsCell eventId={params.row.eventId} type="speakers" />,
        },
        {
            field: 'sessionsCount',
            headerName: 'Sessions',
            width: 100,
            renderCell: (params: any) => <EventStatsCell eventId={params.row.eventId} type="sessions" />,
        },
    ]

    return (
        <Container component="main" maxWidth="lg">
            <EventLayoutAuthUser />
            <Typography variant="h1">Admin 🍿</Typography>

            <Button variant="outlined" size="large" href="/">
                {isAdmin ? 'GO BACK' : 'Not an admin, back off!'}
            </Button>

            <FirestoreQueryLoaderAndErrorDisplay hookResult={events} />

            <Box sx={{ height: '80vh', width: '100%' }}>
                <DataGrid
                    rows={eventsAsRow}
                    columns={columns}
                    initialState={{
                        pagination: {
                            paginationModel: {
                                pageSize: 50,
                            },
                        },
                    }}
                    checkboxSelection
                    disableRowSelectionOnClick
                />
            </Box>
        </Container>
    )
}

interface EventStatsCellProps {
    eventId: string
    type: 'speakers' | 'sessions'
}

const EventStatsCell = ({ eventId, type }: EventStatsCellProps) => {
    const collection = type === 'speakers' ? collections.speakers(eventId) : collections.sessions(eventId)
    const result = useFirestoreCollection(collection, false)

    if (result.isLoading) return <span>Loading...</span>
    if (result.error) return <span>Error</span>

    return <span>{result.data ? result.data.length : 0}</span>
}
