import { useLocalStorage } from '@uidotdev/usehooks'
import { Box, Button, Container, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { DateTime } from 'luxon'
import { useIntermissionEvent } from '../hooks/useIntermissionEvent'
import { useTalkSelection } from '../transcription/useTalkSelection'
import { PublicJSON } from '../publicTypes'
import { IntermissionScreen } from './IntermissionScreen'
import { useQueryParam } from './useQueryParam'

export type IntermissionAppProps = {
    eventId: string
}

export const IntermissionApp = ({ eventId }: IntermissionAppProps) => {
    // Dedicated password, separate from the transcription page. Optional: only used when the event sets one.
    // Kept in localStorage (never put a password in the URL).
    const [intermissionPassword, savePassword] = useLocalStorage<string>('intermissionPassword', '')
    // Picked track persists in the URL so a room screen's config is shareable/bookmarkable.
    const [selectedTrack, setSelectedTrack] = useQueryParam('track', '')
    const [tempPassword, setTempPassword] = useState<string>('')

    const { eventData, isLoading, error, unauthorized } = useIntermissionEvent(eventId, intermissionPassword)
    const [, upcomingTalks] = useTalkSelection(selectedTrack, eventData, false)

    const clearAll = () => {
        savePassword('')
        setSelectedTrack('')
    }

    // 1. Password gate — only shown when the event requires a password (backend replies 401)
    if (unauthorized) {
        return (
            <Container maxWidth="sm" sx={{ mt: '40vh' }}>
                <Typography variant="h5" gutterBottom>
                    Intermission screen
                </Typography>
                <TextField
                    label="Page password"
                    variant="filled"
                    fullWidth
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                />
                <Button
                    variant="contained"
                    sx={{ mt: 2 }}
                    onClick={() => {
                        if (tempPassword.trim().length > 0) {
                            savePassword(tempPassword.trim())
                        }
                    }}>
                    Save password and load
                </Button>
            </Container>
        )
    }

    // 2. Loading / error
    if (isLoading || error || !eventData) {
        const message = error ? `Error: ${error}` : isLoading ? 'Loading…' : 'No event data found'
        return (
            <Container maxWidth="sm" sx={{ mt: 4 }}>
                <Typography variant="h5">Intermission screen</Typography>
                <Typography sx={{ my: 2 }}>{message}</Typography>
                <Button variant="contained" onClick={clearAll}>
                    Clear password & track
                </Button>
            </Container>
        )
    }

    // 3. Track picker (first open, or after "Change track")
    if (!selectedTrack || selectedTrack.length === 0) {
        return (
            <Container maxWidth="sm" sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Pick a track
                </Typography>
                <Box display="flex" flexDirection="column" gap={1} my={2}>
                    {eventData.event.tracks.map((track) => (
                        <Button key={track.id} variant="contained" onClick={() => setSelectedTrack(track.id)}>
                            {track.name}
                        </Button>
                    ))}
                </Box>
                <Button variant="text" onClick={clearAll}>
                    Clear password
                </Button>
            </Container>
        )
    }

    const now = DateTime.now()
    const nextTalk: PublicJSON['sessions'][0] | undefined =
        upcomingTalks.find((t) => DateTime.fromISO(t.dateStart) > now) || upcomingTalks[0]
    const trackName = eventData.event.tracks.find((t) => t.id === selectedTrack)?.name || ''
    const category = nextTalk?.categoryId
        ? eventData.event.categories?.find((c) => c.id === nextTalk.categoryId)
        : undefined

    return (
        <IntermissionScreen
            mediaUrl={eventData.event.intermissionMediaUrl || null}
            nextTalk={nextTalk}
            trackName={trackName}
            categoryName={category?.name || ''}
            categoryColor={category?.color || null}
            language={eventData.event.language}
            eventName={eventData.event.name}
            speakers={eventData.speakers || []}
            onChangeTrack={() => setSelectedTrack('')}
        />
    )
}
