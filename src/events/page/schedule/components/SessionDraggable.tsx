import * as React from 'react'
import { Session } from '../../../../types'
import { Box } from '@mui/material'
import { DEFAULT_SESSION_CARD_BACKGROUND_COLOR } from '../scheduleConstants'
import { SessionCardContent } from './SessionCardContent'

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
                marginLeft: 1,
                position: 'relative',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    backgroundColor: 'red',
                },
                background: session.categoryObject?.color || DEFAULT_SESSION_CARD_BACKGROUND_COLOR,
            }}>
            <SessionCardContent session={session} setLocation={setLocation} />
        </Box>
    )
}
