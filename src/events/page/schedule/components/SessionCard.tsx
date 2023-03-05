import { Box, Typography } from '@mui/material'
import * as React from 'react'
import { DateTimeType, DragTypes, Session, Track } from '../../../../types'
import { useDrag } from 'react-dnd'
import { ScheduleSlotDurationMinutes, SlotHeight, SlotWidth } from '../scheduleConstants'

export type SessionCardProps = {
    session: Session
    absolute?: boolean
    updateSession: (session: Session) => void
}
export const SessionCard = ({ session, updateSession, absolute = true }: SessionCardProps) => {
    const [{}, drag] = useDrag(
        () => ({
            type: DragTypes.Session,
            collect: (monitor) => ({
                isDragging: monitor.isDragging(),
            }),
            end: (draggedItem, monitor) => {
                if (monitor.didDrop()) {
                    console.log('did drop', monitor.getDropResult())
                    const result = monitor.getDropResult<{
                        startEndTime: DateTimeType
                        track: Track
                    }>()
                    if (result?.startEndTime && result.track) {
                        const track = result.track
                        const time = result.startEndTime
                        updateSession({
                            ...session,
                            trackId: track.id,
                            dates: {
                                start: time.start,
                                end: time.end,
                            },
                        })
                    }
                }
            },
        }),
        []
    )

    return (
        <Box
            ref={drag}
            sx={{
                width: SlotWidth,
                height: SlotHeight * (session.durationMinutes / ScheduleSlotDurationMinutes || 1),
                border: '1px solid blue',
                borderRadius: 2,
                padding: 1,
                position: absolute ? 'absolute' : 'relative',
                background: 'rgba(55,55,200,0.3)',
                cursor: 'grab',
                zIndex: 1,
            }}>
            <Typography fontWeight={600}>{session.title}</Typography>
        </Box>
    )
}
