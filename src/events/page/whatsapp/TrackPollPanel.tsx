import { useCallback, useEffect, useState } from 'react'
import { Box, Chip, Stack, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { doc, updateDoc } from 'firebase/firestore'
import { Event } from '../../../types'
import { fetchOpenPlannerApi } from '../../../services/hooks/useOpenPlannerApi'
import { useNotification } from '../../../hooks/notificationHook'
import { collections } from '../../../services/firebase'

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

// Timing reminders auto-scheduled by the backend when GO is sent — kept here only to render their
// status (sent/pending), matched against SessionStatus.panelsSent.
const PANEL_MESSAGES = ['Panneau 15 min', 'Panneau 10 min', 'Panneau 5 min', 'Fin de session']

// Sends the track poll, polls for the resulting readiness, and lets the operator broadcast GO once
// every track has voted ready.
export const TrackPollPanel = ({ event, chatId }: TrackPollPanelProps) => {
    const { createNotification } = useNotification()
    const [starting, setStarting] = useState(false)
    const [sendingGo, setSendingGo] = useState(false)
    const [status, setStatus] = useState<SessionStatus | null>(null)

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

    // Poll so button presses (handled via the GreenAPI webhook) and scheduled reminders show up
    // without a manual reload.
    useEffect(() => {
        refresh()
        const id = setInterval(refresh, 5000)
        return () => clearInterval(id)
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

    const sendGo = async () => {
        setSendingGo(true)
        try {
            await fetchOpenPlannerApi(event, 'whatsapp/track-management/go', { method: 'POST' })
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

    const trackList = status?.tracks ?? []
    const readyCount = trackList.filter((t) => t.ready).length
    const total = trackList.length
    const allTracksReady = total > 0 && readyCount === total
    const panelsSent = status?.panelsSent ?? []

    return (
        <Box>
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
                            onClick={sendGo}
                            disabled={sendingGo}
                            loading={sendingGo}
                            variant="contained"
                            color="success"
                            sx={{ mt: 2 }}>
                            Send GO message
                        </LoadingButton>
                    )}

                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Reminders
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {PANEL_MESSAGES.map((message) => {
                            const sent = panelsSent.includes(message)
                            return (
                                <Chip
                                    key={message}
                                    label={message}
                                    color={sent ? 'success' : 'default'}
                                    variant={sent ? 'filled' : 'outlined'}
                                />
                            )
                        })}
                    </Stack>
                </Box>
            )}
        </Box>
    )
}
