import {
    Box,
    Button,
    Card,
    Container,
    FormControlLabel,
    Grid,
    IconButton,
    InputAdornment,
    Switch,
    TextField,
    Typography,
} from '@mui/material'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { Event, Session } from '../../../../types'
import { useSessions } from '../../../../services/hooks/useSessions'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { EventSessionItem } from '../EventSessionItem'
import { RequireConferenceHallConnections } from '../../../../components/RequireConferenceHallConnections'
import { SessionsImporterFromConferenceHallDialog } from '../components/SessionsImporterFromConferenceHallDialog'
import { Clear } from '@mui/icons-material'
import { filterSessions } from './filterSessions'
import { FilterCategory } from './FilterCategory'
import { FilterFormat } from './FilterFormat'

export type EventSessionsProps = {
    event: Event
}
export const EventSessions = ({ event }: EventSessionsProps) => {
    const sessions = useSessions(event)
    const [sessionsImportOpen, setSessionsImportOpen] = useState(false)
    const [displayedSessions, setDisplayedSessions] = useState<Session[]>([])
    const [search, setSearch] = useState<string>('')
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [selectedFormat, setSelectedFormat] = useState<string>('')
    const [onlyWithoutSpeaker, setOnlyWithoutSpeaker] = useState<boolean>(false)

    const sessionsData = sessions.data || []
    const isFiltered = displayedSessions.length !== sessionsData.length

    useEffect(() => {
        setDisplayedSessions(
            filterSessions(sessionsData, {
                search,
                category: selectedCategory,
                format: selectedFormat,
                withoutSpeaker: onlyWithoutSpeaker,
            })
        )
    }, [sessionsData, search, selectedCategory, selectedFormat, onlyWithoutSpeaker])

    if (sessions.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={sessions} />
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
                <Typography>
                    {isFiltered
                        ? `${displayedSessions.length}/${sessionsData.length} sessions`
                        : `${sessionsData.length} sessions`}
                </Typography>
                <RequireConferenceHallConnections event={event}>
                    <Button onClick={() => setSessionsImportOpen(true)}>Import proposals from ConferenceHall</Button>
                </RequireConferenceHallConnections>
                <Button href="/sessions/new" variant="contained">
                    Add session
                </Button>
            </Box>
            <Card sx={{ paddingX: 2 }}>
                <Grid container spacing={1}>
                    <Grid item xs={12} md={6}>
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
                                            onClick={() => setDisplayedSessions(displayedSessions)}
                                            edge="end">
                                            <Clear />
                                        </IconButton>
                                    </InputAdornment>
                                ) : null,
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <FilterCategory
                            event={event}
                            selectedCategory={selectedCategory}
                            setSelectedCategory={setSelectedCategory}
                        />
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <FilterFormat
                            event={event}
                            selectedFormat={selectedFormat}
                            setSelectedFormat={setSelectedFormat}
                        />
                    </Grid>
                    <Grid item xs={6} md={3} sx={{ marginTop: 0 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    value={onlyWithoutSpeaker}
                                    onChange={(e) => setOnlyWithoutSpeaker(e.target.checked)}
                                />
                            }
                            label="Without speaker"
                        />
                    </Grid>
                </Grid>
                {displayedSessions.map((session: Session) => (
                    <EventSessionItem key={session.id} session={session} selectFormat={setSelectedFormat} />
                ))}
            </Card>
            {sessionsImportOpen && (
                <SessionsImporterFromConferenceHallDialog
                    event={event}
                    isOpen={sessionsImportOpen}
                    onClose={() => {
                        setSessionsImportOpen(false)
                        // noinspection JSIgnoredPromiseFromCall
                        sessions.refetch()
                    }}
                />
            )}
        </Container>
    )
}
