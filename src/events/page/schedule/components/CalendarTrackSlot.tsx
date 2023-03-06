import * as React from 'react'
import { DragTypes, Session, Track } from '../../../../types'
import { SessionCard } from './SessionCard'
import { Box } from '@mui/material'
import { useDrop } from 'react-dnd'
import { SlotWidth } from '../scheduleConstants'
import { StartEndTime } from '../../../../utils/diffDays'

export type CalendarTrackSlotProps = {
    track: Track
    session?: Session
    startEndTime: StartEndTime
    updateSession: (session: Session) => void
}
export const CalendarTrackSlot = ({ track, session, startEndTime, updateSession }: CalendarTrackSlotProps) => {
    const [{ isOver, canDrop }, drop] = useDrop(
        () => ({
            accept: DragTypes.Session,
            canDrop: () => {
                return !session
            },
            drop: () => {
                return {
                    track,
                    startEndTime,
                }
            },
            collect: (monitor) => ({
                isOver: monitor.isOver(),
                canDrop: monitor.canDrop(),
            }),
        }),
        [session]
    )

    return (
        <Box
            key={track.id}
            ref={drop}
            sx={{
                borderRight: '1px dashed #ddd',
                width: SlotWidth,
                position: 'relative',
                background: isOver ? (canDrop ? '#AAF' : 'red') : 'transparent',
            }}>
            {session && <SessionCard session={session} updateSession={updateSession} />}
        </Box>
    )
}
