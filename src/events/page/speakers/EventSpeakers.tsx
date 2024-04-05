import { Box, Button, Card, Container, Grid, IconButton, InputAdornment, TextField, Typography } from '@mui/material'
import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Event, Speaker } from '../../../types'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { EventSpeakerItem } from './EventSpeakerItem'
import { useSpeakers } from '../../../services/hooks/useSpeakersMap'
import { RequireConferenceHallConnections } from '../../../components/RequireConferenceHallConnections'
import { SpeakersFromConferenceHallUpdaterDialog } from './components/SpeakersFromConferenceHallUpdaterDialog'
import { Clear } from '@mui/icons-material'
import { useSessionsRaw } from '../../../services/hooks/useSessions'
import { SpeakersStatsDialog } from './components/SpeakersStatsDialog'

export type EventSpeakersProps = {
    event: Event
}
export const EventSpeakers = ({ event }: EventSpeakersProps) => {
    const speakers = useSpeakers(event.id)
    const sessions = useSessionsRaw(event.id)
    const [updaterDialogOpen, setUpdaterDialogOpen] = useState(false)
    const [speakersStatsOpen, setSpeakersStatsOpen] = useState(false)
    const [displayedSpeakers, setDisplayedSpeakers] = useState<Speaker[]>([])
    const [search, setSearch] = useState<string>('')

    const speakersData = useMemo(() => speakers.data || [], [speakers.data])
    const isFiltered = displayedSpeakers.length !== speakersData.length

    useEffect(() => {
        const searchFiltered = search.toLowerCase().trim()
        setDisplayedSpeakers(
            speakersData.filter((s) => {
                if (s.name.toLowerCase().includes(searchFiltered)) {
                    return true
                }
                if (s.note && s.note.toLowerCase().includes(searchFiltered)) {
                    return true
                }
                if (s.company && s.company.toLowerCase().includes(searchFiltered)) {
                    return true
                }
            })
        )
    }, [speakersData, search])

    if (speakers.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={speakers} />
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
                <Typography>{speakers.data?.length} speakers</Typography>
                <RequireConferenceHallConnections event={event}>
                    <Button onClick={() => setUpdaterDialogOpen(true)}>
                        Update speakers infos from ConferenceHall
                    </Button>
                </RequireConferenceHallConnections>
                <Button onClick={() => setSpeakersStatsOpen(true)}>Speakers stats</Button>
                <Button href="/speakers/new" variant="contained">
                    Add speaker
                </Button>
            </Box>
            <Card sx={{ paddingX: 2 }}>
                <Grid container>
                    <Grid item xs={12} md={12}>
                        <TextField
                            placeholder="Search"
                            fullWidth
                            size="small"
                            margin="normal"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                endAdornment: isFiltered ? (
                                    <InputAdornment position="start">
                                        <IconButton
                                            aria-label="Clear filters"
                                            onClick={() => setDisplayedSpeakers(speakersData)}
                                            edge="end">
                                            <Clear />
                                        </IconButton>
                                    </InputAdornment>
                                ) : null,
                            }}
                        />
                    </Grid>
                </Grid>

                {displayedSpeakers.map((speaker: Speaker) => (
                    <EventSpeakerItem key={speaker.id} speaker={speaker} sessions={sessions.data || []} />
                ))}
            </Card>
            {updaterDialogOpen && (
                <SpeakersFromConferenceHallUpdaterDialog
                    event={event}
                    speakers={speakers.data || []}
                    isOpen={updaterDialogOpen}
                    onClose={() => {
                        setUpdaterDialogOpen(false)
                    }}
                />
            )}
            {speakersStatsOpen && (
                <SpeakersStatsDialog
                    isOpen={speakersStatsOpen}
                    onClose={() => {
                        setSpeakersStatsOpen(false)
                    }}
                    speakers={speakers.data || []}
                />
            )}
        </Container>
    )
}
