import React from 'react'
import { useBupherChannels } from '../../../services/bupher/useBupherChannels'
import { Event } from '../../../types'
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Link,
    Alert,
    Divider,
    CircularProgress,
} from '@mui/material'
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material'
import { useBupherScheduledPosts } from '../../../services/bupher/useBupherScheduledPosts'

export const BupherScheduledPosts = ({ event }: { event: Event }) => {
    const { posts, isLoading, error } = useBupherScheduledPosts(event)

    if (isLoading) {
        return <CircularProgress />
    }

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                Social Channels
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
        </Box>
    )
}
