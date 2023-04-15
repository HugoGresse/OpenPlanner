import * as React from 'react'
import { Session } from '../../../../types'
import { Box, IconButton, Typography } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'

export type SessionCardContentProps = {
    session: Session

    setLocation: (to: string) => void
}
export const SessionCardContent = ({ session, setLocation }: SessionCardContentProps) => {
    if (!session.id) {
        return null
    }
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
                    }}>
                    {session.title.slice(0, 50)}
                </Typography>
                <IconButton
                    onClick={() => {
                        setLocation(`/sessions/${session.id}?schedule=true`)
                    }}
                    sx={{ position: 'absolute', top: 0, right: 0 }}>
                    <EditIcon color="action" fontSize="small" />
                </IconButton>
            </Box>
            <Typography color="white" variant="caption" lineHeight={1}>
                {`${session.formatText || 'no format'} • ${session.categoryObject?.name || 'no category'}`}
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
