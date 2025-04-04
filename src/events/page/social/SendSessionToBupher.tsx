import { useCallback, useState } from 'react'
import { Session, Event, TeasingPosts } from '../../../types'
import { Button, CircularProgress, Box, Alert } from '@mui/material'
import { BUHPER_NAME, BUPHER_PUBLISH_DRAFT } from './bupherName'
import { bupherAPI, BupherProfile } from '../../actions/social/bupherAPI'
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material'
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material'

const getFile = async (url: string) => {
    const response = await fetch(url)
    if (!response.ok) {
        console.error('Failed to fetch video or image', response)
        throw new Error('Failed to fetch video or image, see logs for details')
    }
    const blob = await response.blob()
    const fileType = blob.type || 'image/png' // Fallback to image/png if type is empty
    const extension = fileType.split('/')[1] || 'png'
    const fileName = `${fileType.split('/')[0]}.${extension}`
    return new File([blob], fileName, { type: fileType })
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

            // Check if any of the channels are YouTube or TikTok
            const unsupportedChannels = bufferProfiles.filter((profile) => ['youtube', 'tiktok'].includes(profile.type))

            if (unsupportedChannels.length > 0) {
                setError('YouTube and TikTok are not supported yet, please fill an issue on Github')
                return
            }

            // Check if we have content for all supported channels
            const supportedProfiles = bufferProfiles.filter((profile) => {
                const type = profile.type as keyof TeasingPosts
                return session.teasingPosts?.[type] !== undefined
            })

            if (supportedProfiles.length === 0) {
                setError('No text content found for any of the supported channels')
                return
            }

            // Get the file URL
            const fileUrl = session.teaserVideoUrl || session.teaserImageUrl
            if (!fileUrl) {
                setError('No image or video found, if you want to post without media, open a Github issue please')
                return
            }

            try {
                // Get the main file (video or image)
                const file = await getFile(fileUrl)

                // Get the thumbnail file if it's a video and we have an image URL
                let thumbnailFile: File | undefined
                if (session.teaserVideoUrl && session.teaserImageUrl) {
                    try {
                        thumbnailFile = await getFile(session.teaserImageUrl)
                    } catch (error) {
                        console.warn('Failed to fetch thumbnail image:', error)
                        // Continue without the thumbnail
                    }
                }

                // Create a map of profile IDs to content
                const contentMap: Record<string, string> = {}
                let hasValidContent = false

                for (const profile of supportedProfiles) {
                    const type = profile.type as keyof TeasingPosts
                    const content = session.teasingPosts?.[type]

                    if (content) {
                        contentMap[profile.id] = content
                        hasValidContent = true
                    }
                }

                if (!hasValidContent) {
                    setError('No valid content found for any of the supported channels')
                    return
                }

                // Send all profiles at once with their specific content
                const post = await bupherAPI.postDraftPost(
                    event.id,
                    event.apiKey || '',
                    supportedProfiles,
                    contentMap,
                    file,
                    thumbnailFile
                )

                if (!post.success) {
                    setError('Failed to post to Bupher: ' + (post.error || 'Unknown error'))
                    return
                }

                setSuccess(`${supportedProfiles.length} draft(s) saved`)
            } catch (error) {
                console.error('Error posting to Bupher:', error)
                setError(`Error posting to Bupher: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
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
                startIcon={
                    isLoading ? (
                        <CircularProgress size={20} color="inherit" />
                    ) : success ? (
                        <CheckCircleIcon color="success" />
                    ) : null
                }>
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
                        View drafts in {BUHPER_NAME}
                    </Button>
                </Box>
            )}
        </Box>
    )
}
