import { Avatar, Box, Button, Typography } from '@mui/material'
import { logout, selectUserOpenPlanner, UserState } from '../../auth/authReducer'
import * as React from 'react'
import { useAppDispatch } from '../../reduxStore'
import { useSelector } from 'react-redux'

export const EventLayoutAuthUser = () => {
    const dispatch = useAppDispatch()
    const user = useSelector(selectUserOpenPlanner) as UserState

    return (
        <Box display="flex" justifyContent="flex-end" alignItems="flex-end" flexDirection="column" marginTop={1}>
            <Box display="flex" alignItems="center">
                <Avatar alt={user.avatarURL} src={user.displayName}></Avatar>
                <Typography variant="body1" textTransform="capitalize" marginLeft={1}>
                    {user.displayName}
                </Typography>
                <Button onClick={() => dispatch(logout())}>Logout</Button>
            </Box>
        </Box>
    )
}
