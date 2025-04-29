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

const getChannelUrl = (type: string, handle: string) => {
    switch (type.toLowerCase()) {
        case 'twitter':
            return `https://twitter.com/${handle}`
        case 'instagram':
            return `https://instagram.com/${handle}`
        case 'facebook':
            return `https://facebook.com/${handle}`
        case 'linkedin':
            return `https://linkedin.com/in/${handle}`
        case 'youtube':
            return `https://youtube.com/${handle}`
        case 'tiktok':
            return `https://tiktok.com/@${handle}`
        case 'bluesky':
            return `https://bsky.app/profile/${handle}`
        default:
            return `https://${type}.com/${handle}`
    }
}
export const BupherChannels = ({ event }: { event: Event }) => {
    const { channels, isLoading, error } = useBupherChannels(event)

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
            {channels && channels.length > 0 ? (
                <List sx={{ bgcolor: 'background.paper' }}>
                    {channels.map((channel, index) => (
                        <React.Fragment key={`${channel.type}-${channel.handle}`}>
                            <ListItem
                                alignItems="flex-start"
                                sx={{
                                    textDecoration: 'none',
                                    color: 'text.primary',
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                    },
                                }}>
                                <ListItemAvatar>
                                    <Avatar
                                        alt={channel.formatted_username}
                                        src={channel.avatarUrl}
                                        sx={{ bgcolor: 'primary.main' }}>
                                        {!channel.avatarUrl && channel.type.charAt(0).toUpperCase()}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Box
                                                component="a"
                                                href={getChannelUrl(channel.type, channel.handle)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    color: 'inherit',
                                                    textDecoration: 'none',
                                                    cursor: 'pointer',
                                                }}>
                                                <Typography component="span" variant="body1" color="text.primary">
                                                    {channel.formatted_username}
                                                </Typography>
                                                <OpenInNewIcon
                                                    fontSize="small"
                                                    sx={{ ml: 0.5, fontSize: '0.875rem' }}
                                                />
                                            </Box>
                                        </Box>
                                    }
                                    secondary={
                                        <Typography component="span" variant="body2" color="text.secondary">
                                            {channel.type.charAt(0).toUpperCase() + channel.type.slice(1)}
                                        </Typography>
                                    }
                                />
                            </ListItem>
                            {index < channels.length - 1 && <Divider variant="inset" component="li" />}
                        </React.Fragment>
                    ))}
                </List>
            ) : (
                !error && (
                    <Typography variant="body2" color="text.secondary">
                        No social channels available.
                    </Typography>
                )
            )}
        </Box>
    )
}
