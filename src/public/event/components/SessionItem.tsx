import { Box, Typography, Avatar, AvatarGroup, Paper, Chip } from '@mui/material'
import { JsonSession, JsonSpeaker } from '../../../events/actions/updateWebsiteActions/jsonTypes'
import { Category } from '../../../types'
import { LanguageFlag } from './LanguageFlag'

type SessionItemProps = {
    session: JsonSession & { speakersData?: JsonSpeaker[] }
    categories: Category[]
}

export const SessionItem = ({ session, categories }: SessionItemProps) => {
    const category = session.categoryId ? categories.find((cat) => cat.id === session.categoryId) : null

    return (
        <Paper
            elevation={1}
            sx={{
                height: '100%',
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper',
                borderRadius: 1,
                overflow: 'hidden',
                '&:hover': {
                    bgcolor: 'action.hover',
                },
            }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 1,
                    flexDirection: 'column',
                }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                    {session.title}
                </Typography>
            </Box>

            {session.speakersData && session.speakersData.length > 0 && (
                <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
                        {session.speakersData.map((speaker) => (
                            <Avatar key={speaker.id} alt={speaker.name} src={speaker.photoUrl || undefined} />
                        ))}
                    </AvatarGroup>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                            flexGrow: 1,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: '1.2em',
                            maxHeight: '2.4em',
                        }}>
                        {session.speakersData.map((speaker) => speaker.name).join(', ')}
                    </Typography>
                </Box>
            )}
            {(!session.speakersData || session.speakersData.length === 0) && !category && session.abstract && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {session.abstract}
                </Typography>
            )}
            {category && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Chip
                        label={category.name}
                        size="small"
                        sx={{
                            bgcolor: category.color || 'primary.main',
                            color: 'white',
                            flexGrow: 1,
                        }}
                    />
                    {session.language && <LanguageFlag language={session.language} size="sm" />}
                </Box>
            )}
        </Paper>
    )
}
