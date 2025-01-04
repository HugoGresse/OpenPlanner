import { useState } from 'react'
import {
    Avatar,
    Box,
    CircularProgress,
    Divider,
    IconButton,
    Link,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Toolbar,
} from '@mui/material'
import { EventScreenMenuItems } from '../EventScreenMenuItems'
import { useSelector } from 'react-redux'
import { logout, selectUserOpenPlanner } from '../../../auth/authReducer'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAppDispatch } from '../../../reduxStore'
import { LoadingButton } from '@mui/lab'
import { Event } from '../../../types'
import { useNotification } from '../../../hooks/notificationHook'
import { updateWebsiteTriggerWebhooksAction } from '../../actions/updateWebsiteActions/updateWebsiteTriggerWebhooksAction'
import { EventSelector } from '../../../components/EventSelector'

export type EventDrawerContentProps = {
    event: Event
}

export const EventDrawerContent = ({ event }: EventDrawerContentProps) => {
    const dispatch = useAppDispatch()
    const [loading, setLoading] = useState(false)
    const user = useSelector(selectUserOpenPlanner)
    const { createNotification } = useNotification()

    return (
        <>
            <Toolbar
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: [1],
                }}>
                <EventSelector event={event} />
            </Toolbar>
            <Divider />
            <List component="nav">
                <EventScreenMenuItems />
                <LoadingButton
                    variant="contained"
                    loading={loading}
                    disabled={loading}
                    onClick={async () => {
                        setLoading(true)
                        await updateWebsiteTriggerWebhooksAction(event, createNotification)
                        setLoading(false)
                    }}
                    sx={{
                        margin: 1,
                        whiteSpace: 'break-spaces',
                    }}
                    loadingIndicator={<CircularProgress color="secondary" size={16} />}>
                    <ListItemText primary={'Update website'} />
                </LoadingButton>
            </List>
            <Box marginTop="auto">
                <List>
                    <ListItem
                        secondaryAction={
                            <IconButton
                                edge="end"
                                aria-label="logout"
                                component={Link}
                                href="../../../"
                                onClick={() => {
                                    dispatch(logout())
                                }}>
                                <LogoutIcon />
                            </IconButton>
                        }>
                        <ListItemAvatar>
                            <Avatar alt={user?.avatarURL} src={user?.displayName}></Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={user?.displayName} />
                    </ListItem>
                </List>
            </Box>
        </>
    )
}
