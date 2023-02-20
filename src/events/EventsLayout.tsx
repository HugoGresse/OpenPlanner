import * as React from 'react'
import { Avatar, Box, Button, Container, Typography } from '@mui/material'
import { useAppDispatch } from '../reduxStore'
import { logout, selectUserConferenceCenter, UserState } from '../auth/authReducer'
import { useSelector } from 'react-redux'

export type EventsLayoutProps = {
    children: React.ReactNode
}
export const EventsLayout = ({ children }: EventsLayoutProps) => {
    const dispatch = useAppDispatch()
    const user = useSelector(selectUserConferenceCenter) as UserState
    return (
        <Container component="main" maxWidth="md">
            <Box display="flex" justifyContent="flex-end" alignItems="flex-end" flexDirection="column" marginTop={1}>
                <Box display="flex" alignItems="center">
                    <Avatar alt={user.avatarURL} src={user.displayName}></Avatar>
                    <Typography variant="body1" textTransform="capitalize" marginLeft={1}>
                        {user.displayName}
                    </Typography>
                    <Button onClick={() => dispatch(logout())}>Logout</Button>
                </Box>
            </Box>

            <Typography variant="h1">ConferenceCenter</Typography>
            <Typography variant="h2">Your events</Typography>

            {children}
        </Container>
    )
}
