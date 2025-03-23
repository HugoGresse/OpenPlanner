import { Box, Button, Card, CardContent, Typography } from '@mui/material'
import { Event } from '../../../types'
import { useState } from 'react'
import { useBupherDraftPost } from '../../../services/bupher/useBupherDraftPost'

interface TestBupherDraftPostProps {
    event: Event
}

export const TestBupherDraftPost = ({ event }: TestBupherDraftPostProps) => {
    const [isDownloading, setIsDownloading] = useState(false)
    const { post, isLoading, error } = useBupherDraftPost(event)

    console.log('isLoading', isLoading)
    console.log('error', error)

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
            const success = await post([], 'Hello', file)
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
                                {isDownloading ? 'Downloading...' : 'Download and upload to Bupher'}
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
