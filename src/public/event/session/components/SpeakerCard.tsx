import { Box, Typography, Avatar } from '@mui/material'
import { JsonSpeaker } from '../../../../../functions/src/api/routes/deploy/updateWebsiteActions/jsonTypes'
import MDEditor from '@uiw/react-md-editor'
import { SpeakerLinks } from './SpeakerLinks'
type SpeakerCardProps = {
    speaker: JsonSpeaker
}

export const SpeakerCard = ({ speaker }: SpeakerCardProps) => (
    <Box sx={{ display: 'flex', gap: 2 }}>
        <Avatar alt={speaker.name} src={speaker.photoUrl || undefined} sx={{ width: 64, height: 64 }} />
        <Box sx={{ flex: 1 }}>
            <Typography variant="h6">
                {speaker.name}
                <SpeakerLinks socials={speaker.socials} />
            </Typography>
            {(speaker.jobTitle || speaker.company) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle1" color="text.secondary">
                        {speaker.jobTitle}
                        {speaker.jobTitle && speaker.company && ' @ '}
                        {speaker.company}
                    </Typography>
                    {speaker.companyLogoUrl && (
                        <img
                            src={speaker.companyLogoUrl}
                            alt={speaker.company || ''}
                            style={{ height: 25, objectFit: 'contain' }}
                        />
                    )}
                </Box>
            )}
            {speaker.bio && <MDEditor.Markdown source={speaker.bio} />}
        </Box>
    </Box>
)
