import { Box, Typography, Paper } from '@mui/material'
import MDEditor from '@uiw/react-md-editor'
import { useMemo } from 'react'
import { BackToSchedule } from './components/BackToSchedule'
import { SpeakerCard } from './components/SpeakerCard'
import { ResourceLinks } from './components/ResourceLinks'
import { SessionTags } from './components/SessionTags'
import { useSessionDateTime } from './hooks/useSessionDateTime'
import { JsonSpeaker } from '../../../../events/actions/updateWebsiteActions/jsonTypes'
import { JsonSession } from '../../../../events/actions/updateWebsiteActions/jsonTypes'
import { Category, Track } from '../../../../types'
import { isMobile as isMobileHook } from '../../../../hooks/sizesHooks'
type PublicTalkDetailProps = {
    session: JsonSession & { speakersData?: JsonSpeaker[] }
    categories: Category[]
    tracks: Track[]
}

export const PublicTalkDetail = ({ session, categories, tracks }: PublicTalkDetailProps) => {
    const isMobile = isMobileHook()
    const category = useMemo(
        () => (session.categoryId ? categories.find((cat) => cat.id === session.categoryId) ?? null : null),
        [session.categoryId, categories]
    )

    const track = useMemo(
        () => (session.trackId ? tracks.find((t) => t.id === session.trackId) ?? null : null),
        [session.trackId, tracks]
    )

    const dateTime = useSessionDateTime(session.dateStart ?? null, session.dateEnd ?? null, session.durationMinutes)

    return (
        <Box component="main" sx={{ maxWidth: 800, mx: 'auto' }}>
            <BackToSchedule to="/" />

            <Paper component="article" elevation={isMobile ? 0 : 2} sx={{ p: isMobile ? 1 : 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    {session.title}
                </Typography>

                {(track || session.dateStart) && (
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                        {track?.name}
                        {track && session.dateStart && ' • '}
                        {session.dateStart && (
                            <>
                                {dateTime.dayName}, {dateTime.date} • {dateTime.startTime} - {dateTime.endTime}
                                {dateTime.durationText && ` (${dateTime.durationText})`}
                            </>
                        )}
                    </Typography>
                )}

                <ResourceLinks presentationLink={session.presentationLink} videoLink={session.videoLink} />

                <SessionTags category={category} level={session.level} language={session.language} />

                {session.abstract && (
                    <Box component="section" sx={{ mt: 3, mb: 4 }}>
                        <MDEditor.Markdown source={session.abstract} />
                    </Box>
                )}

                {session.speakersData && session.speakersData.length > 0 && (
                    <Box component="section" sx={{ mt: 4 }}>
                        <Typography variant="h6" component="h2" gutterBottom>
                            Speakers
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {session.speakersData.map((speaker: JsonSpeaker) => (
                                <SpeakerCard key={speaker.id} speaker={speaker} />
                            ))}
                        </Box>
                    </Box>
                )}
            </Paper>
        </Box>
    )
}

export default PublicTalkDetail
