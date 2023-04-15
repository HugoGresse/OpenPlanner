import * as React from 'react'
import { Session } from '../../../../types'
import { Box, IconButton, Typography } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import { DEFAULT_SESSION_CARD_BACKGROUND_COLOR } from '../scheduleConstants'

export type SessionDraggableProps = {
    session: Session
    setLocation: (to: string) => void
}
export const SessionDraggable = ({ session, setLocation }: SessionDraggableProps) => {
    return (
        <Box
            className="noDateSession fc-day fc-day-thu fc-day-future fc-timegrid-col fc-resource"
            title={session.title}
            data-id={session.id}
            sx={{
                display: 'flex',
                cursor: 'grab',
                width: 120,
                paddingY: 0.2,
                paddingX: 0.5,
                borderRadius: 2,
                position: 'relative',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    backgroundColor: 'red',
                },
                background: session.categoryObject?.color || DEFAULT_SESSION_CARD_BACKGROUND_COLOR,
            }}>
            <Box display="flex" flexDirection="column" justifyContent="space-between">
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
                        <EditIcon color="action" fontSize="small" sx={{}} />
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
        </Box>
    )
}
