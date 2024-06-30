import { useLocalStorage } from '@uidotdev/usehooks'
import { Box, Button, Container, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranscription } from '../hooks/useTranscription'
import { useTalkSelection } from './useTalkSelection'
import { DateTime } from 'luxon'

export type PublicEventTranscriptionProps = {
    eventId: string
}

export const TranscriptionApp = ({ eventId }: PublicEventTranscriptionProps) => {
    const [pagePassword, savePagePassword] = useLocalStorage<string>('pagePassword', '')
    const [selectedTrack, setSelectedTrack] = useLocalStorage<string>('selectedTrack', '')
    const [tempPagePassword, saveTempPagePassword] = useState<string>('')

    const [gladiaAPIKey, eventData, isLoading, error] = useTranscription(eventId, pagePassword)

    const [selectedTalk, upcomingTalks, resetSelectedTalk, setSelectedTalk] = useTalkSelection(selectedTrack, eventData)

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
                            console.log('saving password', tempPagePassword.trim())
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

    const startTime = DateTime.fromISO(selectedTalk?.dateStart).toFormat('HH:mm')
    const endTime = DateTime.fromISO(selectedTalk?.dateEnd).toFormat('HH:mm')
    const currentTalkIndex = upcomingTalks.findIndex((t) => t.id === selectedTalk?.id)
    const windowHeight = window.innerHeight
    const iframeHeight = windowHeight - 200

    return (
        <Box>
            <iframe
                id={selectedTalk?.id}
                key={selectedTalk?.id}
                src={`https://openplanner.fr/gladia.html?token=${gladiaAPIKey}&font_size=40`}
                width="100%"
                height={`${iframeHeight}px`}
                allow="camera; microphone"
                style={{ border: 'none' }}
            />

            <Box
                position={'absolute'}
                right={0}
                bottom={0}
                display={'flex'}
                alignItems={'center'}
                justifyContent={'center'}>
                <p>
                    TRACK: {selectedTrack} Talk: {selectedTalk?.title} Start: {startTime} End: {endTime}
                </p>
                <p>Next talk: {upcomingTalks[currentTalkIndex + 1]?.title}</p>
                <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                        setSelectedTalk(upcomingTalks[currentTalkIndex + 1])
                    }}>
                    Go to next talk
                </Button>
                <Button size="small" variant="contained" onClick={() => saveStuffInLocalStorage('', '')}>
                    Clear password
                </Button>
            </Box>
        </Box>
    )
}
