import * as React from 'react'
import { Session } from '../../../../types'
import { Box, IconButton, Typography } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import { DEFAULT_SESSION_CARD_BACKGROUND_COLOR } from '../scheduleConstants'

export type SessionCardContentProps = {
    session: Session
    setLocation?: (to: string) => void
}
export const SessionCardContent = ({ session, setLocation }: SessionCardContentProps) => {
    if (!session.id) {
        return null
    }

    // Detect luminance of the background color and set the text color accordingly
    const backgroundColor = session.categoryObject?.color || DEFAULT_SESSION_CARD_BACKGROUND_COLOR
    const textColor = backgroundColor
        ? parseInt(backgroundColor.slice(1), 16) > 0xffffff / 2
            ? 'black'
            : 'white'
        : 'white'

    const startTime = session.dates?.start?.toFormat('HH:mm')
    const endTime = session.dates?.end?.toFormat('HH:mm')

    return (
        <Box display="flex" flexDirection="column" justifyContent="space-between" height="100%">
            <Box display="flex" justifyContent="space-between">
                <Typography
                    fontWeight={600}
                    color="white"
                    lineHeight={1}
                    variant="body2"
                    sx={{
                        textOverflow: 'ellipsis',
                        wordWrap: 'break-word',
                        overflow: 'hidden',
                        maxHeight: 42,
                        color: textColor,
                    }}>
                    {session.title.slice(0, 50)}
                </Typography>
                {setLocation && (
                    <IconButton
                        onClick={() => {
                            setLocation(`/sessions/${session.id}`)
                        }}
                        sx={{ position: 'absolute', top: 0, right: 0 }}>
                        <EditIcon fontSize="small" htmlColor={textColor} />
                    </IconButton>
                )}
            </Box>
            <Typography color={textColor} variant="caption" lineHeight={1}>
                {`${session.formatText || 'no format'} • ${session.categoryObject?.name || 'no category'}`}
                {startTime ? ` • ${startTime} → ${endTime}` : null}
                <br />
                <Box
                    sx={{
                        backgroundColor: 'rgba(255,255,255, 0.7)',
                        width: 'fit-content',
                        color: '#000',
                        borderRadius: 1,
                        paddingX: 0.4,
                    }}>
                    {session.speakersData?.map((s) => s?.name).join(', ')}
                </Box>
            </Typography>
        </Box>
    )
}
