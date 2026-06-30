import { useLocalStorage } from '@uidotdev/usehooks'
import { Box, Button, Container, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { usePasswordProtectedEvent } from '../hooks/usePasswordProtectedEvent'
import { useTalkSelection } from './useTalkSelection'
import { useAutoReloadAfterTalk } from './useAutoReloadAfterTalk'
import { LiveTranscriptionView } from './LiveTranscriptionView'
import { DateTime } from 'luxon'

export type PublicEventTranscriptionProps = {
    eventId: string
}

export const TranscriptionApp = ({ eventId }: PublicEventTranscriptionProps) => {
    const [pagePassword, savePagePassword] = useLocalStorage<string>('pagePassword', '')
    const [selectedTrack, setSelectedTrack] = useLocalStorage<string>('selectedTrack', '')
    const [tempPagePassword, saveTempPagePassword] = useState<string>('')

    const { reply, eventData, isLoading, error } = usePasswordProtectedEvent(eventId, pagePassword)
    const gladiaAPIKey = reply?.gladiaAPIKey

    const [selectedTalk, upcomingTalks, resetSelectedTalk, setSelectedTalk] = useTalkSelection(selectedTrack, eventData)

    // Roll the screen over automatically 5 min after the current talk ends.
    useAutoReloadAfterTalk(selectedTalk?.dateEnd)

    const saveStuffInLocalStorage = (pagePassword: string, selectedTrack: string) => {
        setSelectedTrack(selectedTrack)
        savePagePassword(pagePassword)
        if (selectedTrack.length === 0 && pagePassword === '') {
            resetSelectedTalk()
        }
    }

    if (!pagePassword || pagePassword.length === 0) {
        return (
            <Container maxWidth="xl" sx={{ mt: '90vh', mb: 4 }}>
                <TextField
                    label="Page password"
                    variant="filled"
                    fullWidth
                    value={tempPagePassword}
                    onChange={(e) => saveTempPagePassword(e.target.value)}
                />

                <Button
                    variant="contained"
                    onClick={() => {
                        if (tempPagePassword.length > 0) {
                            saveStuffInLocalStorage(tempPagePassword.trim(), selectedTrack)
                        }
                    }}>
                    Save password and load
                </Button>
            </Container>
        )
    }

    if (isLoading || error || !eventData) {
        const message = !eventData ? 'No event data found' : isLoading ? 'Loading...' : 'Error: ' + error?.toString()
        return (
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h1">Transcription</Typography>
                <Typography>{message}</Typography>
                <Button variant="contained" onClick={() => saveStuffInLocalStorage('', '')}>
                    Clear password/track
                </Button>
            </Container>
        )
    }

    if (!selectedTrack || selectedTrack === '') {
        return (
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h1">Transcription</Typography>
                <Typography>Select a track</Typography>

                {eventData?.event.tracks.map((track) => {
                    return (
                        <Button
                            key={track.id}
                            variant="contained"
                            onClick={() => {
                                setSelectedTrack(track.id)
                                // save the track in the local storage
                            }}>
                            {track.name} ({track.id})
                        </Button>
                    )
                })}

                <br />
                <br />

                <Button variant="contained" onClick={() => saveStuffInLocalStorage('', '')}>
                    Clear password & track
                </Button>
            </Container>
        )
    }

    if (!selectedTalk) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h1">Transcription</Typography>
                <Typography>Select a talk first...</Typography>
                <Button
                    variant="contained"
                    onClick={() => {
                        setSelectedTrack('')
                    }}>
                    Change track
                </Button>
                <Button
                    variant="contained"
                    onClick={() => {
                        setSelectedTalk({
                            id: 'no-preconfigured-talk' + Date.now(),
                            title: 'No preconfigured talk',
                            dateStart: DateTime.now().toISO(),
                            dateEnd: DateTime.now().plus({ hours: 1 }).toISO(),
                            abstract: [],
                            showInFeedback: true,
                            speakersIds: [],
                            trackId: selectedTrack,
                        })
                    }}>
                    Use without talk
                </Button>
                <Button variant="contained" onClick={() => saveStuffInLocalStorage('', '')}>
                    Clear password & track
                </Button>
            </Container>
        )
    }

    const currentTalkIndex = upcomingTalks.findIndex((t) => t.id === selectedTalk?.id)
    const nextTalk = upcomingTalks[currentTalkIndex + 1]
    const trackName = eventData.event.tracks.find((t) => t.id === selectedTrack)?.name ?? selectedTrack

    return (
        <Box>
            <LiveTranscriptionView
                apiKey={gladiaAPIKey}
                sessionKey={selectedTalk?.id ?? ''}
                trackName={trackName}
                talkTitle={selectedTalk.title}
                dateStart={selectedTalk.dateStart}
                dateEnd={selectedTalk.dateEnd}
                nextTalkTitle={nextTalk?.title}
                onNext={() => nextTalk && setSelectedTalk(nextTalk)}
                onClear={() => saveStuffInLocalStorage('', '')}
            />
        </Box>
    )
}
