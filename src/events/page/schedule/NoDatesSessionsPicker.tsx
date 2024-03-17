import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { Session } from '../../../types'
import { SessionCardMinHeight } from './scheduleConstants'
import { DocumentData } from '@firebase/firestore'
import { SessionDraggable } from './components/SessionDraggable'
import { Draggable } from '@fullcalendar/interaction'
import { useLocation } from 'wouter'
import { UseQueryResult } from '../../../services/hooks/firestoreQueryHook'

export type NoDatesSessionsPickerProps = {
    sessions: UseQueryResult<DocumentData>
    title: string
}
export const NoDatesSessionsPicker = ({ sessions, title }: NoDatesSessionsPickerProps) => {
    const [sessionsToDisplay, setSessionsToDisplay] = useState<Session[]>([])
    const [_, setLocation] = useLocation()
    const [isDragInit, setIsDragInit] = useState(false)

    useEffect(() => {
        if (sessions.data) {
            setSessionsToDisplay(
                sessions.data.filter((session: Session) => {
                    return !session.trackId || !session.dates || !session.dates.start
                })
            )
        }
    }, [sessions])

    const initDraggable = useCallback((node: HTMLElement) => {
        if (!node || isDragInit) {
            return
        }
        new Draggable(node, {
            itemSelector: '.noDateSession',
            eventData: function (eventEl) {
                const id = eventEl.dataset.id
                const title = eventEl.dataset.title
                const backgroundColor = eventEl.dataset.backgroundcolor
                const duration = eventEl.dataset.duration

                return {
                    id: id,
                    title: title,
                    textColor: '#000000',
                    backgroundColor: backgroundColor,
                    duration: duration,
                    create: true,
                }
            },
        })
        setIsDragInit(true)
    }, [])

    if (!sessionsToDisplay.length) {
        return null
    }

    return (
        <Box
            ref={initDraggable}
            id="external-events"
            sx={{
                display: 'flex',
                position: 'sticky',
                top: 0,
                left: 12,
                zIndex: 100,
                backgroundColor: '#88888822',
                height: SessionCardMinHeight,
                minHeight: 150,
                padding: 2,
                margin: 2,
                border: '2px dashed #d8d8d8',
                borderRadius: 2,
                overflowX: 'auto',
                overflowY: 'hidden',
            }}>
            <Typography sx={{ width: 80, marginRight: 2 }}>{title}</Typography>
            {sessionsToDisplay.map((session: Session) => (
                <SessionDraggable key={session.id} session={session} setLocation={setLocation} />
            ))}
        </Box>
    )
}
