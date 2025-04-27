import { Box, FormControl, FormLabel, Typography, Chip, Link, FormHelperText, CircularProgress } from '@mui/material'
import { Event, Speaker } from '../../../../types'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { useSpeakerSessions } from '../../../../services/hooks/useSpeakerSessions'

type SpeakerSessionsProps = {
    event: Event
    speaker: Speaker
}

export const SpeakerSessions = ({ event, speaker }: SpeakerSessionsProps) => {
    const sessionsResult = useSpeakerSessions(event, speaker.id)

    return (
        <FormControl fullWidth disabled={sessionsResult.isLoading} sx={{ mt: 3 }}>
            <FormLabel id="speaker-sessions-label" sx={{ fontWeight: 'bold', mb: 1 }}>
                Speaker's Sessions
            </FormLabel>

            {sessionsResult.isLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="text.secondary">
                        Loading sessions...
                    </Typography>
                </Box>
            )}

            {sessionsResult.error && (
                <FormHelperText error>Error loading sessions: {sessionsResult.error.toString()}</FormHelperText>
            )}

            {!sessionsResult.isLoading && sessionsResult.data && sessionsResult.data.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    No sessions found for this speaker.
                </Typography>
            )}

            {!sessionsResult.isLoading && sessionsResult.data && sessionsResult.data.length > 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        p: 1,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                        backgroundColor: 'action.hover',
                    }}>
                    {sessionsResult.data.map((session) => (
                        <Chip
                            key={session.id}
                            label={session.title}
                            component={Link}
                            href={`/sessions/${session.id}?fromSpeaker=${speaker.id}`}
                            sx={{ cursor: 'pointer' }}
                            color="primary"
                            variant="outlined"
                            size="small"
                        />
                    ))}
                </Box>
            )}
        </FormControl>
    )
}
