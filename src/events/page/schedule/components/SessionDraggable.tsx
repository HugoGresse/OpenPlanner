import * as React from 'react'
import { Session } from '../../../../types'
import { Box } from '@mui/material'
import { SessionCardContent } from './SessionCardContent'
import { getSessionBackgroundColor } from './getSessionBackgroundColor'
import { hexDarken } from '../../../../utils/colors/hexDarken'

export type SessionDraggableProps = {
    session: Session
    setLocation: (to: string) => void
}
export const SessionDraggable = ({ session, setLocation }: SessionDraggableProps) => {
    const backgroundColor = getSessionBackgroundColor(session)

    const hours = Math.floor(session.durationMinutes / 60)
    const minutes = session.durationMinutes % 60

    return (
        <Box
            className="noDateSession"
            data-id={session.id}
            data-backgroundcolor={backgroundColor}
            data-title={session.title}
            data-duration={`${hours}:${minutes}` || '00:30'}
            sx={{
                display: 'flex',
                cursor: 'grab',
                width: 120,
                paddingY: 0.2,
                paddingX: 0.5,
                borderRadius: 2,
                marginLeft: 1,
                position: 'relative',
                transition: 'background 0.2s ease-in-out',
                '&:hover': {
                    background: hexDarken(backgroundColor, 15),
                },
                background: backgroundColor,
            }}>
            <SessionCardContent session={session} setLocation={setLocation} />
        </Box>
    )
}
