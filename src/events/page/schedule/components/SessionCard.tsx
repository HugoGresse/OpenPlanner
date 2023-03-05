import { Box } from '@mui/material'
import * as React from 'react'
import { DragTypes, Session } from '../../../../types'
import { SlotWidth } from './CalendarSlot'
import { useDrag } from 'react-dnd'

export type SessionCardProps = {
    session: Session
}
export const SessionCard = ({ session }: SessionCardProps) => {
    const [{ isDragging }, drag, preview] = useDrag(
        () => ({
            type: DragTypes.Session,
            collect: (monitor) => ({
                isDragging: !!monitor.isDragging(),
            }),
        }),
        []
    )

    console.log(isDragging)

    return (
        <Box
            ref={drag}
            sx={{
                width: SlotWidth,
                height: 100,
                border: '1px solid blue',
                borderRadius: 2,
                position: 'absolute',
                background: 'rgba(55,55,200,0.3)',
                cursor: 'grab',
                zIndex: 1,
            }}>
            {session.title}
        </Box>
    )
}
