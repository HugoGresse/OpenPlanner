import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Checkbox, Chip, FormControlLabel, FormGroup, Stack, Switch, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { doc, updateDoc } from 'firebase/firestore'
import { useLocalStorage } from '@uidotdev/usehooks'
import { DateTime } from 'luxon'
import { Event } from '../../../types'
import { fetchOpenPlannerApi } from '../../../services/hooks/useOpenPlannerApi'
import { useNotification } from '../../../hooks/notificationHook'
import { useSessions } from '../../../services/hooks/useSessions'
import { collections } from '../../../services/firebase'
import { ScheduledRemindersList } from './ScheduledRemindersList'

type TrackStatus = { id: string; name: string; ready: boolean }
type SessionStatus = {
    chatId: string | null
    tracks: TrackStatus[]
    goSent: boolean
    panelsSent: string[]
}

export type TrackPollPanelProps = {
    event: Event
    chatId: string
}

type PanelMessage = { message: string; delaySeconds: number }

const TALK_PANEL_CONFIGURATION: PanelMessage[] = [
    { message: 'Panneau 15 min', delaySeconds: 35 * 60 },
    { message: 'Panneau 10 min', delaySeconds: 40 * 60 },
    { message: 'Panneau 5 min', delaySeconds: 45 * 60 },
    { message: 'Fin de session', delaySeconds: 50 * 60 },
]

const QUICKY_PANEL_CONFIGURATION: PanelMessage[] = [
    { message: 'Panneau 10 min', delaySeconds: 10 * 60 },
    { message: 'Panneau 5 min', delaySeconds: 15 * 60 },
    { message: 'Fin de session', delaySeconds: 20 * 60 },
]

// Sends the track poll, polls for the resulting readiness, and lets the operator broadcast GO once
// every track has voted ready.
export const TrackPollPanel = ({ event, chatId }: TrackPollPanelProps) => {
    const { createNotification } = useNotification()
    const { data: sessions } = useSessions(event)
    const [starting, setStarting] = useState(false)
    const [sendingGo, setSendingGo] = useState(false)
    const [status, setStatus] = useState<SessionStatus | null>(null)
    // false = Talk (default), true = Quicky. Persisted per event.
    const [isQuicky, setIsQuicky] = useLocalStorage<boolean>(`whatsapp-quicky-mode-${event.id}`, false)
    const panelConfig = isQuicky ? QUICKY_PANEL_CONFIGURATION : TALK_PANEL_CONFIGURATION
    // Which reminders to auto-schedule when GO is sent. All by default, persisted per event.
    const [autoPanels, setAutoPanels] = useLocalStorage<PanelMessage[]>(`whatsapp-auto-panels-${event.id}`, panelConfig)

    const switchConfig = (quicky: boolean) => {
        setIsQuicky(quicky)
        setAutoPanels(quicky ? QUICKY_PANEL_CONFIGURATION : TALK_PANEL_CONFIGURATION)
    }

    const togglePanel = (entry: PanelMessage) => {
        const included = autoPanels.some((p) => p.message === entry.message)
        setAutoPanels(included ? autoPanels.filter((p) => p.message !== entry.message) : [...autoPanels, entry])
    }

    const refresh = useCallback(async () => {
        try {
            const s = await fetchOpenPlannerApi<SessionStatus>(event, 'whatsapp/track-management/status', {
                method: 'GET',
            })
            setStatus(s)
        } catch {
            // status polling is best-effort
        }
    }, [event])

    // Poll every 3s so poll votes (via the GreenAPI webhook) and scheduled reminders show up without a
    // manual reload — but only while the window is focused. Polling pauses on blur/tab-hide and resumes
    // (with an immediate refresh) on focus, and hard-stops after 2h with no focus activity so a
    // forgotten tab doesn't poll forever.
    useEffect(() => {
        const INACTIVITY_MS = 2 * 60 * 60 * 1000
        let timer: ReturnType<typeof setInterval> | null = null
        let deadline = Date.now() + INACTIVITY_MS
        // Track focus via blur/focus events (document.hasFocus() is unreliable in embedded contexts);
        // assume focused on mount.
        let blurred = false

        const stop = () => {
            if (timer) {
                clearInterval(timer)
                timer = null
            }
        }
        const startPolling = () => {
            if (timer) return
            refresh()
            timer = setInterval(() => {
                if (Date.now() > deadline) {
                    stop()
                    return
                }
                refresh()
            }, 3000)
        }

        const sync = () => {
            if (!document.hidden && !blurred) {
                // Focus/visibility regained counts as activity: push the inactivity deadline back.
                deadline = Date.now() + INACTIVITY_MS
                startPolling()
            } else {
                stop()
            }
        }

        const onFocus = () => {
            blurred = false
            sync()
        }
        const onBlur = () => {
            blurred = true
            sync()
        }

        window.addEventListener('focus', onFocus)
        window.addEventListener('blur', onBlur)
        document.addEventListener('visibilitychange', sync)
        sync()

        return () => {
            window.removeEventListener('focus', onFocus)
            window.removeEventListener('blur', onBlur)
            document.removeEventListener('visibilitychange', sync)
            stop()
        }
    }, [refresh])

    const start = async () => {
        setStarting(true)
        try {
            await fetchOpenPlannerApi(event, 'whatsapp/track-management/start', {
                method: 'POST',
                body: { chatId },
            })
            // Remember the chat for next time.
            await updateDoc(doc(collections.events, event.id), { whatsappSharedChatId: chatId.trim() || null })
            createNotification('Track buttons sent', { type: 'success' })
            await refresh()
        } catch (error) {
            createNotification('Failed to start: ' + (error instanceof Error ? error.message : 'Unknown error'), {
                type: 'error',
            })
        } finally {
            setStarting(false)
        }
    }

    const sendGo = async (force = false) => {
        setSendingGo(true)
        try {
            await fetchOpenPlannerApi(event, 'whatsapp/track-management/go', {
                method: 'POST',
                body: { panels: autoPanels, force },
            })
            createNotification('GO message sent', { type: 'success' })
            await refresh()
        } catch (error) {
            createNotification('Failed to send GO: ' + (error instanceof Error ? error.message : 'Unknown error'), {
                type: 'error',
            })
        } finally {
            setSendingGo(false)
        }
    }

    // The conference slot currently running: sessions whose window spans now; takes the latest such
    // start (the slot in progress) and that slot's end.
    const currentSlot = useMemo(() => {
        const now = DateTime.now()
        const running = (sessions ?? []).filter(
            (s) => s.dates?.start && s.dates?.end && s.dates.start <= now && s.dates.end > now
        )
        if (running.length === 0) return null
        const start = running.reduce(
            (max, s) => (s.dates!.start! > max ? s.dates!.start! : max),
            running[0].dates!.start!
        )
        const end = running
            .filter((s) => +s.dates!.start! === +start)
            .reduce((max, s) => (s.dates?.end && s.dates.end > max ? s.dates.end : max), start)
        return { start, end }
    }, [sessions])

    // The next upcoming conference slot: soonest session start in the future, with the slot's end.
    const nextSlot = useMemo(() => {
        const now = DateTime.now()
        const upcoming = (sessions ?? []).filter((s) => s.dates?.start && s.dates.start > now)
        if (upcoming.length === 0) return null
        const start = upcoming.reduce(
            (min, s) => (s.dates!.start! < min ? s.dates!.start! : min),
            upcoming[0].dates!.start!
        )
        const end = upcoming
            .filter((s) => +s.dates!.start! === +start)
            .reduce((max, s) => (s.dates?.end && s.dates.end > max ? s.dates.end : max), start)
        return { start, end }
    }, [sessions])

    const formatSlot = (slot: { start: DateTime; end: DateTime }): string => {
        const fmt = slot.start.hasSame(DateTime.now(), 'day') ? 'HH:mm' : 'ccc dd LLL HH:mm'
        return `${slot.start.toFormat(fmt)} – ${slot.end.toFormat('HH:mm')}`
    }

    const trackList = status?.tracks ?? []
    const readyCount = trackList.filter((t) => t.ready).length
    const total = trackList.length
    const allTracksReady = total > 0 && readyCount === total
    const panelsSent = status?.panelsSent ?? []

    // Buzz the device when the readiness count changes (a track manager just voted), so the operator
    // notices without watching the screen. Skip the first render (ref starts null).
    const prevReadyCount = useRef<number | null>(null)
    useEffect(() => {
        if (prevReadyCount.current !== null && readyCount !== prevReadyCount.current) {
            navigator.vibrate?.(200)
        }
        prevReadyCount.current = readyCount
    }, [readyCount])

    return (
        <Box>
            {currentSlot && <Typography variant="subtitle2">Current conference: {formatSlot(currentSlot)}</Typography>}
            {nextSlot && (
                <Typography variant="subtitle2" gutterBottom>
                    Next conference: {formatSlot(nextSlot)}
                </Typography>
            )}
            <FormControlLabel
                control={<Switch checked={!!isQuicky} onChange={(e) => switchConfig(e.target.checked)} />}
                label={isQuicky ? 'Quicky' : 'Talk'}
                sx={{ mb: 1 }}
            />

            <LoadingButton
                onClick={start}
                disabled={starting || chatId.trim().length === 0}
                loading={starting}
                variant="contained"
                sx={{ mb: 2 }}>
                Send track poll
            </LoadingButton>

            {total > 0 && (
                <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                        Readiness {readyCount}/{total}
                        {status?.goSent ? ' — GO sent 🟢' : ''}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {trackList.map((t) => (
                            <Chip
                                key={t.id}
                                label={t.name}
                                color={t.ready ? 'success' : 'default'}
                                variant={t.ready ? 'filled' : 'outlined'}
                            />
                        ))}
                    </Stack>

                    {allTracksReady && !status?.goSent && (
                        <LoadingButton
                            onClick={() => sendGo(false)}
                            disabled={sendingGo}
                            loading={sendingGo}
                            variant="contained"
                            color="success"
                            sx={{ mt: 2 }}>
                            Send GO message
                        </LoadingButton>
                    )}

                    {!allTracksReady && readyCount > 0 && !status?.goSent && (
                        <LoadingButton
                            onClick={() => sendGo(true)}
                            disabled={sendingGo}
                            loading={sendingGo}
                            variant="outlined"
                            color="warning"
                            sx={{ mt: 2 }}>
                            Force GO ({readyCount}/{total} ready)
                        </LoadingButton>
                    )}

                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Auto reminders {status?.goSent ? '' : '(scheduled on GO)'}
                    </Typography>
                    {status?.goSent ? (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {panelConfig.map((entry) => {
                                const sent = panelsSent.includes(entry.message)
                                return (
                                    <Chip
                                        key={entry.message}
                                        label={entry.message}
                                        color={sent ? 'success' : 'default'}
                                        variant={sent ? 'filled' : 'outlined'}
                                    />
                                )
                            })}
                        </Stack>
                    ) : (
                        <FormGroup row>
                            {panelConfig.map((entry) => (
                                <FormControlLabel
                                    key={entry.message}
                                    control={
                                        <Checkbox
                                            checked={autoPanels.some((p: PanelMessage) => p.message === entry.message)}
                                            onChange={() => togglePanel(entry)}
                                        />
                                    }
                                    label={entry.message}
                                />
                            ))}
                        </FormGroup>
                    )}

                    {status?.goSent && <ScheduledRemindersList event={event} refreshSignal={panelsSent.length} />}
                </Box>
            )}
        </Box>
    )
}
