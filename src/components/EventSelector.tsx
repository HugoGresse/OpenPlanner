import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import { useSelector } from 'react-redux'
import { selectUserIdOpenPlanner } from '../auth/authReducer'
import { useEvents } from '../services/hooks/useEvents'
import { Event } from '../types'

export const EventSelector = ({ event }: { event: Event }) => {
    const userId = useSelector(selectUserIdOpenPlanner)
    const events = useEvents(userId)

    const handleChange = (eventId: string) => {
        const currentPath = window.location.pathname
        const afterEventId = currentPath.substring(currentPath.indexOf(event.id) + event.id.length)
        window.history.pushState({}, '', `/events/${eventId}${afterEventId}`)
    }

    if (!events.data || events.isLoading) {
        return null
    }

    return (
        <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel id="event-select-label">Event</InputLabel>
            <Select
                labelId="event-select-label"
                id="event-select"
                value={event.id}
                label="Event"
                onChange={(e) => handleChange(e.target.value)}>
                {(events.data as Event[]).map((event) => (
                    <MenuItem key={event.id} value={event.id}>
                        {event.name}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )
}
