import { Box, IconButton, Typography } from '@mui/material'
import * as React from 'react'
import { DateTimeType, DragTypes, Session, Track } from '../../../../types'
import { useDrag } from 'react-dnd'
import { ScheduleSlotDurationMinutes, SlotHeight } from '../scheduleConstants'
import { Rnd } from 'react-rnd'
import EditIcon from '@mui/icons-material/Edit'
import { useLocation } from 'wouter'
import { dateTimeToHourMinutes } from '../../../../utils/timeFormats'

export type SessionCardProps = {
    session: Session
    absolute?: boolean
    updateSession: (session: Session) => void
}
export const DEFAULT_SESSION_CARD_BACKGROUND_COLOR = '#6A64F9'
export const SessionCard = ({ session, updateSession, absolute = true }: SessionCardProps) => {
    const [_, setLocation] = useLocation()

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

    const cardHeight = SlotHeight * (session.durationMinutes / ScheduleSlotDurationMinutes || 120)

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
                height: cardHeight,
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
                        second: 0,
                    })

                    startTime.set({
                        second: 0,
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
                cursor: 'grab',
                zIndex: 1,
            }}
            className="session-card-rnd">
            <Box
                ref={drag}
                sx={{
                    display: 'flex',
                    flex: 1,
                    height: '100%',
                    width: '100%',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: absolute ? 'absolute' : 'relative',
                    background: session.categoryObject?.color || DEFAULT_SESSION_CARD_BACKGROUND_COLOR,
                    borderRadius: 2,
                    overflow: 'hidden',
                    cursor: 'grab',
                    zIndex: 1,
                    paddingTop: 0.2,
                    paddingLeft: 0.5,
                    paddingRight: 0.2,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        backgroundColor: 'red',
                        width: vw * 0.15,
                    },
                }}>
                <Box display="flex" flexDirection="column" justifyContent="space-between">
                    <Box display="flex" justifyContent="space-between">
                        <Typography fontWeight={600} color="white" lineHeight={1} variant="body2" whiteSpace="nowrap">
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
                        {`${session.formatText} • ${session.categoryObject?.name}`}
                        <br />
                        <Box
                            sx={{
                                backgroundColor: 'rgba(255,255,255, 0.7)',
                                width: 'fit-content',
                                color: '#000',
                                borderRadius: 1,
                                paddingX: 0.4,
                            }}>
                            {session.speakersData?.map((s) => s.name).join(', ')}
                        </Box>
                    </Typography>
                </Box>
                <Typography color="white" variant="caption" lineHeight={1}>
                    {`${session.durationMinutes + 'm' || '?m'} • ${dateTimeToHourMinutes(
                        session.dates?.start
                    )} - ${dateTimeToHourMinutes(session.dates?.end)}`}
                </Typography>
            </Box>
        </Rnd>
    )
}
