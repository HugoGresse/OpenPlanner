import {
    Avatar,
    Divider,
    FormControl,
    InputBase,
    ListItemIcon,
    ListItemText,
    MenuItem,
    Select,
    styled,
} from '@mui/material'
import { useSelector } from 'react-redux'
import { logout, selectUserOpenPlanner, selectUserIdOpenPlanner } from '../auth/authReducer'
import { useEvents } from '../services/hooks/useEvents'
import { Event } from '../types'
import { HomeOutlined, Logout } from '@mui/icons-material'
import { useAppDispatch } from '../reduxStore'

const CustomInput = styled(InputBase)(({ theme }) => ({
    '& .MuiInputBase-input': {
        borderRadius: 4,
        position: 'relative',
        backgroundColor: theme.palette.background.paper,
        border: 'none',
        fontSize: 16,
        padding: '10px 26px 10px 12px',
    },
}))

const HomeValue = 'home'
const LogoutValue = 'logout'

export const EventSelector = ({ event }: { event: Event }) => {
    const dispatch = useAppDispatch()
    const userId = useSelector(selectUserIdOpenPlanner)
    const events = useEvents(userId)
    const user = useSelector(selectUserOpenPlanner)

    const handleChange = (eventId: string) => {
        if (eventId === HomeValue) {
            window.history.pushState({}, '', `/`)
        } else if (eventId === LogoutValue) {
            dispatch(logout())
        } else {
            const currentPath = window.location.pathname
            const afterEventId = currentPath.substring(currentPath.indexOf(event.id) + event.id.length)
            window.history.pushState({}, '', `/events/${eventId}${afterEventId}`)
        }
    }

    if (!events.data || events.isLoading) {
        return null
    }

    return (
        <FormControl sx={{ flex: 1 }} size="small">
            <Select
                labelId="event-select-label"
                id="event-select"
                value={event.id}
                label="Event"
                input={<CustomInput />}
                onChange={(e) => handleChange(e.target.value)}>
                {(events.data as Event[]).map((event) => (
                    <MenuItem key={event.id} value={event.id}>
                        {event.name}
                    </MenuItem>
                ))}

                <Divider />
                <MenuItem value={HomeValue}>
                    <ListItemIcon>
                        <HomeOutlined fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Home</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem disabled>
                    <ListItemIcon>
                        <Avatar src={user?.avatarURL} sx={{ width: 24, height: 24 }} />
                    </ListItemIcon>
                    <ListItemText>{user?.displayName}</ListItemText>
                </MenuItem>
                <MenuItem value={LogoutValue}>
                    <ListItemIcon>
                        <Logout fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Logout</ListItemText>
                </MenuItem>
            </Select>
        </FormControl>
    )
}
