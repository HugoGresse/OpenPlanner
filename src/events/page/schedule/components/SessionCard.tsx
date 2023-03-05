import { Box } from '@mui/material'
import * as React from 'react'
import { DragTypes, Session } from '../../../../types'
import { useDrag } from 'react-dnd'
import { SessionCardMinHeight, SlotWidth } from '../scheduleConstants'

export type SessionCardProps = {
    session: Session
    absolute?: boolean
}
export const SessionCard = ({ session, absolute = true }: SessionCardProps) => {
    const [{ isDragging }, drag, preview] = useDrag(
        () => ({
            type: DragTypes.Session,
            collect: (monitor) => ({
                isDragging: !!monitor.isDragging(),
            }),
        }),
        []
    )

    // console.log(isDragging)

    return (
        <Box
            ref={drag}
            sx={{
                width: SlotWidth,
                height: SessionCardMinHeight,
                border: '1px solid blue',
                borderRadius: 2,
                position: absolute ? 'absolute' : 'relative',
                background: 'rgba(55,55,200,0.3)',
                cursor: 'grab',
                zIndex: 1,
            }}>
            {session.title}
        </Box>
    )
}
