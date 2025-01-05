import { useState } from 'react'
import { CircularProgress, Divider, List, ListItemText, Toolbar } from '@mui/material'
import { EventScreenMenuItems } from '../EventScreenMenuItems'
import { LoadingButton } from '@mui/lab'
import { Event } from '../../../types'
import { useNotification } from '../../../hooks/notificationHook'
import { updateWebsiteTriggerWebhooksAction } from '../../actions/updateWebsiteActions/updateWebsiteTriggerWebhooksAction'
import { EventSelector } from '../../../components/EventSelector'

export type EventDrawerContentProps = {
    event: Event
}

export const EventDrawerContent = ({ event }: EventDrawerContentProps) => {
    const [loading, setLoading] = useState(false)
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
        </>
    )
}
