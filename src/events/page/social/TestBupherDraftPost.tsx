import { Box, Button, Card, CardContent, Typography } from '@mui/material'
import { Event } from '../../../types'
import { useState } from 'react'
import { useBupherDraftPost } from '../../../services/bupher/useBupherDraftPost'
import { useBupherChannels } from '../../../services/bupher/useBupherChannels'
import { BupherProfile } from '../../../events/actions/social/bupherAPI'
interface TestBupherDraftPostProps {
    event: Event
}

export const TestBupherDraftPost = ({ event }: TestBupherDraftPostProps) => {
    const [isDownloading, setIsDownloading] = useState(false)
    const { channels, isLoading: isChannelsLoading, error: channelsError } = useBupherChannels(event)
    const { post, isLoading, error } = useBupherDraftPost(event)

    const handleDownloadLogo = async () => {
        if (!event.logoUrl) {
            alert('No logo URL available')
            return
        }

        setIsDownloading(true)
        try {
            const response = await fetch(event.logoUrl)
            const blob = await response.blob()
            const file = new File([blob], 'logo.png', { type: 'image/png' })
            const success = await post(
                channels?.map((channel) => ({ id: channel.id, type: channel.type as BupherProfile['type'] })),
                'Hello',
                file
            )
            console.log('success', success)
        } catch (error) {
            console.error('Error downloading logo:', error)
            alert('Failed to download logo')
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <Card sx={{ maxWidth: 400, margin: '20px auto' }}>
            <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    {event.logoUrl ? (
                        <>
                            <img
                                src={event.logoUrl}
                                alt={`${event.name} logo`}
                                style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'contain' }}
                            />
                            <Button variant="contained" onClick={handleDownloadLogo} disabled={isDownloading}>
                                {isDownloading
                                    ? 'Posting...'
                                    : `Test draft post to ${channels?.map((channel) => channel.handle).join(', ')}`}
                            </Button>
                        </>
                    ) : (
                        <Typography color="text.secondary">No logo available for this event</Typography>
                    )}
                </Box>
            </CardContent>
        </Card>
    )
}
