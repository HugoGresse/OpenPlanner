import * as React from 'react'
import { DragTypes, Session, Track } from '../../../../types'
import { SessionCard } from './SessionCard'
import { Box } from '@mui/material'
import { SlotWidth } from './CalendarSlot'
import { useDrop } from 'react-dnd'

export type CalendarTrackSlotProps = {
    track: Track
    session?: Session
}
export const CalendarTrackSlot = ({ track, session }: CalendarTrackSlotProps) => {
    const [{ isOver, canDrop }, drop] = useDrop(
        () => ({
            accept: DragTypes.Session,
            canDrop: () => {
                return !session
            },
            drop: () => {
                console.log('dropped, todo')
            },
            collect: (monitor) => ({
                isOver: !!monitor.isOver(),
                canDrop: !!monitor.canDrop(),
            }),
        }),
        []
    )

    return (
        <Box
            key={track.id}
            ref={drop}
            sx={{
                border: '1px dashed #ddd',
                minWidth: SlotWidth,
                position: 'relative',
                background: isOver ? 'lightblue' : 'transparent',
            }}>
            {session && <SessionCard session={session} />}
        </Box>
    )
}
