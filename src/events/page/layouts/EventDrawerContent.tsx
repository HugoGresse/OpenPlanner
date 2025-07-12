import { useState, useRef } from 'react'
import { Box, CircularProgress, Divider, List, ListItemText, Toolbar, Tooltip } from '@mui/material'
import { EventScreenMenuItems } from '../EventScreenMenuItems'
import { LoadingButton } from '@mui/lab'
import { Event } from '../../../types'
import { useNotification } from '../../../hooks/notificationHook'
import { updateWebsiteTriggerWebhooksAction } from '../../actions/updateWebsiteTriggerWebhooksAction'
import { EventSelector } from '../../../components/EventSelector'
import confetti from 'canvas-confetti'
import { DateTime } from 'luxon'
import { OSSSponsor } from '../../../components/OSSSponsor'
import { WatchBuildProgress } from '../../../components/WatchBuildProgress'

export type EventDrawerContentProps = {
    event: Event
}

export const EventDrawerContent = ({ event }: EventDrawerContentProps) => {
    const [loading, setLoading] = useState(false)
    const { createNotification } = useNotification()
    const [githubWatchKey, setGithubWatchKey] = useState(0)
    const buttonRef = useRef<HTMLButtonElement>(null)

    const getRelativeTime = () => {
        if (!event.updatedAt) return 'Never updated'
        return `Last updated ${DateTime.fromJSDate(event.updatedAt).toRelative()}`
    }

    return (
        <>
            <Toolbar
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: [1],
                }}>
                <EventSelector event={event} />
            </Toolbar>
            <Divider />
            <List component="nav">
                <EventScreenMenuItems />
                <Tooltip title={getRelativeTime()} arrow placement="top">
                    <Box>
                        <LoadingButton
                            ref={buttonRef}
                            variant="contained"
                            loading={loading}
                            disabled={loading}
                            onClick={async () => {
                                setLoading(true)
                                await updateWebsiteTriggerWebhooksAction(event, createNotification)
                                setLoading(false)

                                // Trigger confetti effect from button position
                                if (buttonRef.current) {
                                    const rect = buttonRef.current.getBoundingClientRect()
                                    const x = rect.left + rect.width / 2
                                    const y = rect.top + rect.height / 2

                                    confetti({
                                        origin: {
                                            x: x / window.innerWidth,
                                            y: y / window.innerHeight,
                                        },
                                        spread: 70,
                                        startVelocity: 30,
                                        particleCount: 100,
                                        angle: 20,
                                        gravity: -0.4,
                                        zIndex: 2000,
                                        drift: 0.5,
                                    })
                                }
                                let count = 0
                                const intervalId = setInterval(() => {
                                    setGithubWatchKey((prev) => prev + 1)
                                    count += 1
                                    if (count === 5) {
                                        clearInterval(intervalId)
                                    }
                                }, 1000)
                            }}
                            sx={{
                                margin: 1,
                                whiteSpace: 'break-spaces',
                                width: 'calc(100% - 16px)',
                            }}
                            loadingIndicator={<CircularProgress color="secondary" size={16} />}>
                            <ListItemText primary={'Update website'} />
                        </LoadingButton>
                        {event.repoUrl && (
                            <WatchBuildProgress
                                key={githubWatchKey} // it trigger the refresh of the component after a deploy on the button above
                                repoUrl={event.repoUrl}
                                token={event.repoToken || undefined}
                                refreshInterval={5000}
                                timeout={180000}
                            />
                        )}
                    </Box>
                </Tooltip>
            </List>

            <Box padding={1}>
                <OSSSponsor />
            </Box>
        </>
    )
}
