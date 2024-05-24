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

export const AdminScreen = ({}) => {
    const userId = useSelector(selectUserIdOpenPlanner)
    const events = useAdminEvents()
    const isAdmin = useIsAdmin(userId)

    const eventsAsRow = (events.data || []).map((event: any) => {
        return {
            id: event.id,
            createdAt: event.createdAt.toDate().toLocaleString(),
            name: event.name,
            happenAt: DateTime.fromJSDate(event.dates.start).toRelative(),
        }
    })

    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'createdAt', headerName: 'Created At', width: 200 },
        { field: 'name', headerName: 'Name', width: 200 },
        { field: 'happenAt', headerName: 'happenAt', width: 200 },
    ]

    return (
        <Container component="main" maxWidth="md">
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
