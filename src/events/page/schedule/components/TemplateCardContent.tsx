import * as React from 'react'
import { Session } from '../../../../types'
import { Box, IconButton, Typography } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { DEFAULT_SESSION_CARD_BACKGROUND_COLOR } from '../scheduleConstants'

export type SessionCardContentProps = {
    session: Session
    onDelete?: () => void
}
export const TemplateCardContent = ({ session, onDelete }: SessionCardContentProps) => {
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
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%">
            <Typography color={textColor} variant="caption" lineHeight={1}>
                {`${session.formatText || 'no format'} • ${session.categoryObject?.name || 'no category'}`}
                <br />
                {startTime ? `${startTime} → ${endTime}` : null}
            </Typography>
            {onDelete && (
                <IconButton onClick={onDelete} sx={{ position: 'absolute', top: 0, right: 0 }}>
                    <DeleteIcon fontSize="small" htmlColor={textColor} />
                </IconButton>
            )}
        </Box>
    )
}
