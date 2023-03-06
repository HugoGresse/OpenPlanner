import { Box, Typography } from '@mui/material'
import * as React from 'react'
import { DateTimeType, DragTypes, Session, Track } from '../../../../types'
import { useDrag } from 'react-dnd'
import { ScheduleSlotDurationMinutes, SlotHeight } from '../scheduleConstants'
import { Rnd } from 'react-rnd'

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
                                end: time.end ? time.end.plus({ minutes: session.durationMinutes }) : time.start,
                            },
                        })
                    }
                }
            },
        }),
        [session]
    )
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)

    return (
        <Rnd
            disableDragging={true}
            enableResizing={{
                right: false,
                left: false,
                topRight: false,
                bottomRight: false,
                bottomLeft: false,
                topLeft: false,
                top: absolute,
                bottom: absolute,
            }}
            size={{
                width: vw * 0.1,
                height: SlotHeight * (session.durationMinutes / ScheduleSlotDurationMinutes || 3),
            }}
            dragGrid={[0, 0]}
            resizeGrid={[SlotHeight, SlotHeight]}
            onResizeStop={(e, dir, elementRef, delta) => {
                const deltaDuration = (delta.height / SlotHeight) * ScheduleSlotDurationMinutes

                if (session.dates && session.dates.start && session.dates.end) {
                    let startTime = session.dates.start
                    let endTime = session.dates.end

                    if (dir === 'top') {
                        startTime = startTime.minus({ minutes: deltaDuration })
                    } else if (dir === 'bottom') {
                        endTime = endTime.plus({ minutes: deltaDuration })
                    }

                    // Always snap so the nearest slot
                    endTime = endTime.set({
                        minute: Math.round(endTime.minute / ScheduleSlotDurationMinutes) * ScheduleSlotDurationMinutes,
                    })

                    updateSession({
                        ...session,
                        dates: {
                            start: startTime,
                            end: endTime,
                        },
                        durationMinutes:
                            endTime.diff(startTime, 'minutes').toObject().minutes || ScheduleSlotDurationMinutes,
                    })
                }
            }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                position: absolute ? 'absolute' : 'relative',
                background: 'rgba(70,70,255,0.8)',
                borderRadius: 6,
                overflow: 'hidden',
                cursor: 'grab',
                zIndex: 1,
                paddingTop: 8,
                paddingLeft: 12,
                paddingRight: 12,
            }}>
            <Box
                ref={drag}
                sx={{
                    // width: SlotWidth,
                    flex: 1,
                }}>
                <Typography fontWeight={600} color="white">
                    {session.title}
                </Typography>
            </Box>
        </Rnd>
    )
}
