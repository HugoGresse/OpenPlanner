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
    Paper,
    Chip,
    Tab,
    Tabs,
} from '@mui/material'
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material'
import { useBupherScheduledPosts } from '../../../services/bupher/useBupherScheduledPosts'
import { DateTime } from 'luxon'

// Helper function to get social media icon/avatar
const getSocialIcon = (service: string) => {
    // Return first letter of service as fallback
    return service.charAt(0).toUpperCase()
}

export const BupherScheduledPosts = ({ event }: { event: Event }) => {
    const { posts, isLoading, error } = useBupherScheduledPosts(event)
    const [tabValue, setTabValue] = React.useState(0)

    if (isLoading) {
        return <CircularProgress />
    }

    // Split posts into draft and scheduled
    const draftPosts = posts.filter((post) => post.status === 'draft')
    const scheduledPosts = posts.filter((post) => post.status !== 'draft')

    // Function to group posts by date
    const groupPostsByDate = (postsToGroup: typeof posts) => {
        const grouped = postsToGroup.reduce((acc, post) => {
            const date = post.scheduledAt ? DateTime.fromISO(post.scheduledAt).toFormat('yyyy-MM-dd') : 'No Date'
            if (!acc[date]) {
                acc[date] = []
            }
            acc[date].push(post)
            return acc
        }, {} as Record<string, typeof posts>)

        // Sort dates
        const sortedDates = Object.keys(grouped).sort((a, b) => {
            if (a === 'No Date') return 1
            if (b === 'No Date') return -1
            return DateTime.fromFormat(a, 'yyyy-MM-dd').toMillis() - DateTime.fromFormat(b, 'yyyy-MM-dd').toMillis()
        })

        return { grouped, sortedDates }
    }

    const { grouped: groupedScheduled, sortedDates: sortedScheduledDates } = groupPostsByDate(scheduledPosts)
    const { grouped: groupedDrafts, sortedDates: sortedDraftDates } = groupPostsByDate(draftPosts)

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue)
    }

    // Render posts by date
    const renderPostsByDate = (groupedPosts: Record<string, typeof posts>, sortedDates: string[]) => {
        if (sortedDates.length === 0) {
            return (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    No posts available.
                </Typography>
            )
        }

        return sortedDates.map((date) => (
            <Box key={date} sx={{ mb: 3 }}>
                <Box
                    sx={{
                        fontWeight: 'bold',
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                    }}>
                    <Typography variant="subtitle1" component="span">
                        {date === 'No Date'
                            ? 'No Date'
                            : DateTime.fromFormat(date, 'yyyy-MM-dd').toFormat('EEEE, MMMM d, yyyy')}
                    </Typography>
                    <Chip
                        label={`${groupedPosts[date].length} post${groupedPosts[date].length > 1 ? 's' : ''}`}
                        size="small"
                        sx={{ ml: 1 }}
                    />
                </Box>

                <List sx={{ bgcolor: 'background.paper' }}>
                    {groupedPosts[date].map((post, index) => (
                        <React.Fragment key={post.id}>
                            <Paper elevation={1} sx={{ mb: 1, p: 1 }}>
                                <ListItem alignItems="flex-start">
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: 'primary.main' }}>{getSocialIcon(post.service)}</Avatar>
                                    </ListItemAvatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                mb: 1,
                                            }}>
                                            <Typography variant="body1" color="text.primary">
                                                {post.channelName || post.service}
                                            </Typography>
                                            {post.scheduledAt && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {DateTime.fromISO(post.scheduledAt).toFormat('h:mm a')}
                                                </Typography>
                                            )}
                                        </Box>

                                        <Box sx={{ mt: 1 }}>
                                            <Typography
                                                variant="body2"
                                                color="text.primary"
                                                sx={{
                                                    display: 'block',
                                                    whiteSpace: 'pre-wrap',
                                                    mb: post.imageUrl ? 1 : 0,
                                                }}>
                                                {post.text}
                                            </Typography>

                                            {post.imageUrl && (
                                                <Box
                                                    component="img"
                                                    src={post.imageUrl}
                                                    alt="Post image"
                                                    sx={{
                                                        maxWidth: '100%',
                                                        maxHeight: 200,
                                                        borderRadius: 1,
                                                        mt: 1,
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </ListItem>
                            </Paper>
                            {index < groupedPosts[date].length - 1 && <Box sx={{ my: 1 }} />}
                        </React.Fragment>
                    ))}
                </List>
            </Box>
        ))
    }

    return (
        <Box sx={{ mt: 2 }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {posts.length === 0 && !error ? (
                <Typography variant="body2" color="text.secondary">
                    No posts available.
                </Typography>
            ) : (
                <Box sx={{ width: '100%' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={tabValue} onChange={handleTabChange} aria-label="post tabs">
                            <Tab
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Typography>Scheduled</Typography>
                                        <Chip label={scheduledPosts.length} size="small" sx={{ ml: 1 }} />
                                    </Box>
                                }
                                id="tab-0"
                                aria-controls="tabpanel-0"
                            />
                            <Tab
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Typography>Drafts</Typography>
                                        <Chip label={draftPosts.length} size="small" sx={{ ml: 1 }} />
                                    </Box>
                                }
                                id="tab-1"
                                aria-controls="tabpanel-1"
                            />
                        </Tabs>
                    </Box>
                    <Box role="tabpanel" hidden={tabValue !== 0} id="tabpanel-0" aria-labelledby="tab-0" sx={{ py: 2 }}>
                        {renderPostsByDate(groupedScheduled, sortedScheduledDates)}
                    </Box>
                    <Box role="tabpanel" hidden={tabValue !== 1} id="tabpanel-1" aria-labelledby="tab-1" sx={{ py: 2 }}>
                        {renderPostsByDate(groupedDrafts, sortedDraftDates)}
                    </Box>
                </Box>
            )}
        </Box>
    )
}
