import * as React from 'react'
import { useState } from 'react'
import {
    AppBar as MuiAppBar,
    AppBarProps as MuiAppBarProps,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Divider,
    Drawer as MuiDrawer,
    IconButton,
    Link,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    styled,
    Toolbar,
    Typography,
} from '@mui/material'
import { EventScreenMenuItems, Menu } from './EventScreenMenuItems'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import { useRoute } from 'wouter'
import { useSelector } from 'react-redux'
import { logout, selectUserConferenceCenter } from '../../auth/authReducer'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAppDispatch } from '../../reduxStore'
import { LoadingButton } from '@mui/lab'
import { Event } from '../../types'
import { useNotification } from '../../hooks/notificationHook'
import { updateWebsiteTriggerWebhooksAction } from '../actions/updateWebsiteActions/updateWebsiteTriggerWebhooksAction'
import { AutoUpdateImage } from '../../components/AutoupdateImage'

const drawerWidth: number = 240

interface AppBarProps extends MuiAppBarProps {
    open?: boolean
}

const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}))

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
    '& .MuiDrawer-paper': {
        position: 'relative',
        whiteSpace: 'nowrap',
        width: drawerWidth,
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
        boxSizing: 'border-box',
        ...(!open && {
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
            }),
            width: theme.spacing(7),
            [theme.breakpoints.up('sm')]: {
                width: theme.spacing(9),
            },
        }),
    },
}))

export type EventLayoutProps = {
    children: React.ReactNode
    event: Event
    eventUpdated: () => Promise<any>
}

export const EventLayout = ({ children, event, eventUpdated }: EventLayoutProps) => {
    const dispatch = useAppDispatch()
    const [_, firstParams] = useRoute('/:routeName')
    const [__, subParams] = useRoute('/:routeName/:subRoute')
    const [open, setOpen] = useState(true)
    const [loading, setLoading] = useState(false)
    const user = useSelector(selectUserConferenceCenter)
    const { createNotification } = useNotification()
    const toggleDrawer = () => {
        setOpen(!open)
    }

    const menuItem = Menu.find((item) => {
        return `/${firstParams?.routeName}`.startsWith(item.href) || `/${subParams?.routeName}`.startsWith(item.href)
    })
    const routeName = menuItem ? menuItem.name : 'Loading...'

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="absolute" open={open}>
                <Toolbar
                    sx={{
                        pr: '24px', // keep right padding when drawer closed
                    }}>
                    <IconButton
                        edge="start"
                        color="inherit"
                        aria-label="open drawer"
                        onClick={toggleDrawer}
                        sx={{
                            marginRight: '36px',
                            ...(open && { display: 'none' }),
                        }}>
                        <MenuIcon />
                    </IconButton>
                    <Typography component="h1" variant="h6" color="inherit" noWrap sx={{ flexGrow: 1 }}>
                        {routeName}
                    </Typography>
                </Toolbar>
            </AppBar>
            <Drawer variant="permanent" open={open}>
                <Toolbar
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: [1],
                    }}>
                    <Button href="../../../" component={Link}>
                        All events
                    </Button>
                    <IconButton onClick={toggleDrawer}>
                        <ChevronLeftIcon />
                    </IconButton>
                </Toolbar>
                <Divider />
                <List component="nav">
                    <EventScreenMenuItems />
                    <ListItemButton
                        component={LoadingButton}
                        variant="contained"
                        loading={loading}
                        disabled={loading}
                        onClick={async () => {
                            setLoading(true)
                            await updateWebsiteTriggerWebhooksAction(event, createNotification)
                            await eventUpdated()
                            setLoading(false)
                        }}
                        sx={{
                            margin: 1,
                            whiteSpace: 'break-spaces',
                        }}
                        loadingIndicator={<CircularProgress color="secondary" size={16} />}>
                        <ListItemText primary={'Update website'} />
                    </ListItemButton>
                    {event.statusBadgeUrl && (
                        <Box m={1}>
                            <AutoUpdateImage src={event.statusBadgeUrl} />
                        </Box>
                    )}
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
            </Drawer>
            <Box
                component="main"
                sx={{
                    backgroundColor: (theme) =>
                        theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[900],
                    flexGrow: 1,
                    height: '100vh',
                    overflow: 'auto',
                }}>
                <Toolbar />
                {children}
            </Box>
        </Box>
    )
}
