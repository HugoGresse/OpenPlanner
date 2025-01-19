import { Box, Typography, Avatar, AvatarGroup, Paper, Chip } from '@mui/material'
import { JsonSession, JsonSpeaker } from '../../../events/actions/updateWebsiteActions/jsonTypes'
import { Category, Track } from '../../../types'
import { LanguageFlag } from './LanguageFlag'
import { DateTime } from 'luxon'

type PublicTalkDetailProps = {
    session: JsonSession & { speakersData?: JsonSpeaker[] }
    categories: Category[]
    tracks: Track[]
}

export const PublicTalkDetail = ({ session, categories, tracks }: PublicTalkDetailProps) => {
    const category = session.categoryId ? categories.find((cat) => cat.id === session.categoryId) : null
    const track = session.trackId ? tracks.find((t) => t.id === session.trackId) : null
    const startTime = session.dateStart ? DateTime.fromISO(session.dateStart).toFormat('HH:mm') : ''
    const endTime = session.dateEnd ? DateTime.fromISO(session.dateEnd).toFormat('HH:mm') : ''

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
            <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>
                    {session.title}
                </Typography>

                {track && (
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                        {track.name} • {startTime} - {endTime}
                    </Typography>
                )}

                {session.abstract && (
                    <Typography variant="body1" sx={{ mt: 3, mb: 4 }}>
                        {session.abstract}
                    </Typography>
                )}

                {session.speakersData && session.speakersData.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h6" gutterBottom>
                            Speakers
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {session.speakersData.map((speaker) => (
                                <Box key={speaker.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Avatar alt={speaker.name} src={speaker.photoUrl || undefined} />
                                    <Typography>{speaker.name}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 4 }}>
                    {category && (
                        <Chip
                            label={category.name}
                            sx={{
                                bgcolor: category.color || 'primary.main',
                                color: 'white',
                            }}
                        />
                    )}
                    {session.language && <LanguageFlag language={session.language} size="sm" />}
                </Box>
            </Paper>
        </Box>
    )
}
