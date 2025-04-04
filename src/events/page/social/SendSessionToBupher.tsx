import { useCallback, useState } from 'react'
import { Session, Event, TeasingPosts } from '../../../types'
import { Button, CircularProgress, Box, Alert, Typography } from '@mui/material'
import { BUHPER_NAME, BUPHER_PUBLISH_DRAFT } from './bupherName'
import { bupherAPI, BupherProfile } from '../../actions/social/bupherAPI'
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material'

const getFile = async (url: string) => {
    const response = await fetch(url)
    if (!response.ok) {
        console.error('Failed to fetch video or image', response)
        throw new Error('Failed to fetch video or image, see logs for details')
    }
    const blob = await response.blob()
    return new File([blob], 'image.png', { type: 'image/png' })
}

export const SendSettionToBupher = ({ event, session }: { event: Event; session: Session }) => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const handleSend = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        setSuccess(null)
        try {
            const channelsResponse = await bupherAPI.getChannels(event.id, event.apiKey || '')
            if (!channelsResponse.success) {
                setError(channelsResponse.error || 'Failed to fetch channels')
                return
            }
            const channels = channelsResponse.channels
            const bufferProfiles: BupherProfile[] = channels.map((channel) => ({
                id: channel.id,
                type: channel.type as BupherProfile['type'],
            }))
            let successCount = 0
            for (const profile of bufferProfiles) {
                if (['youtube', 'tiktok'].includes(profile.type)) {
                    setError('Youtube and TikTok are not supported yet, please fill an issue on Github')
                    continue
                }
                const type = profile.type as keyof TeasingPosts
                if (!session.teasingPosts?.[type]) {
                    setError('No text found for ' + profile.type)
                    continue
                }

                const fileUrl = session.teaserImageUrl
                if (!fileUrl) {
                    setError('No image or video found, if you want to post without media, open a Github issue please')
                    continue
                }

                const file = await getFile(fileUrl)

                const post = await bupherAPI.postDraftPost(
                    event.id,
                    event.apiKey || '',
                    bufferProfiles,
                    session.teasingPosts?.[type],
                    file
                )
                if (!post.success) {
                    setError('Failed to post to ' + profile.type)
                    continue
                }
                successCount++
                setSuccess(`Successfully posted to ${profile.type} (${successCount}/${channels.length})`)
            }
            setSuccess(`Successfully posted to ${successCount}/${channels.length} channels`)
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred')
        } finally {
            setIsLoading(false)
        }
    }, [event, session])

    const handleOpenBupher = useCallback(() => {
        window.open(BUPHER_PUBLISH_DRAFT, '_blank', 'noopener,noreferrer')
    }, [])

    return (
        <Box display="flex" flexDirection="column">
            <Button
                onClick={handleSend}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}>
                {success || `Send to ${BUHPER_NAME}`}
            </Button>
            {error && <Alert severity="error">{error}</Alert>}
            {success && (
                <Box mt={1}>
                    <Button
                        variant="text"
                        color="primary"
                        onClick={handleOpenBupher}
                        startIcon={<OpenInNewIcon />}
                        size="small">
                        View your posts in {BUHPER_NAME}
                    </Button>
                </Box>
            )}
        </Box>
    )
}
