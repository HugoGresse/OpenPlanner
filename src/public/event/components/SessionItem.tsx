import { Box, Typography, Divider, Avatar, AvatarGroup } from '@mui/material'
import { DateTime } from 'luxon'
import { JsonSession, JsonSpeaker } from '../../../events/actions/updateWebsiteActions/jsonTypes'

type SessionItemProps = {
    session: JsonSession & { speakersData?: JsonSpeaker[] }
}

export const SessionItem = ({ session }: SessionItemProps) => {
    return (
        <Box>
            <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h6" color="primary">
                    {session.dateStart && DateTime.fromISO(session.dateStart).toFormat('HH:mm')}
                </Typography>
                <Typography variant="h6">{session.title}</Typography>
            </Box>
            {session.speakersData && session.speakersData.length > 0 && (
                <Box display="flex" alignItems="center" gap={1} sx={{ mt: 2 }}>
                    <AvatarGroup max={4}>
                        {session.speakersData.map((speaker) => (
                            <Avatar
                                key={speaker.id}
                                alt={speaker.name}
                                src={speaker.photoUrl || undefined}
                                sx={{ width: 32, height: 32 }}
                            />
                        ))}
                    </AvatarGroup>
                    <Typography variant="body2" color="text.secondary">
                        {session.speakersData.map((speaker) => speaker.name).join(', ')}
                    </Typography>
                </Box>
            )}
            <Divider sx={{ mt: 2 }} />
        </Box>
    )
}
