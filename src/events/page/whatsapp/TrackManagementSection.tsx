import { useCallback, useEffect, useState } from 'react'
import { Box, Card, Chip, Grid, Stack, TextField, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { Event } from '../../../types'
import { fetchOpenPlannerApi } from '../../../services/hooks/useOpenPlannerApi'
import { useNotification } from '../../../hooks/notificationHook'
import { TypographyCopyable } from '../../../components/TypographyCopyable'
import { API_URL } from '../../../env'

type TrackStatus = { id: string; name: string; ready: boolean }
type SessionStatus = {
    chatId: string | null
    tracks: TrackStatus[]
    goSent: boolean
}

// API_URL may or may not carry a trailing slash; normalise so the URL is always well-formed.
const webhookUrl = `${String(API_URL ?? '').replace(/\/+$/, '')}/v1/whatsapp/webhook`

export const TrackManagementSection = ({ event }: { event: Event }) => {
    const { createNotification } = useNotification()
    const [chatId, setChatId] = useState('')
    const [starting, setStarting] = useState(false)
    const [status, setStatus] = useState<SessionStatus | null>(null)

    const refresh = useCallback(async () => {
        try {
            const s = await fetchOpenPlannerApi<SessionStatus>(event, 'whatsapp/track-management/status', {
                method: 'GET',
            })
            setStatus(s)
            // Prefill the input from the last stored chat so the operator doesn't retype it (without
            // clobbering anything they're currently typing).
            if (s?.chatId) {
                setChatId((prev) => prev || s.chatId || '')
            }
        } catch {
            // status polling is best-effort
        }
    }, [event])

    // Poll so button presses (handled via the GreenAPI webhook) show up without a manual reload.
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

    const trackList = status?.tracks ?? []
    const readyCount = trackList.filter((t) => t.ready).length
    const total = trackList.length

    return (
        <Card sx={{ paddingX: 2, mt: 4, mb: 2 }}>
            <Typography fontSize="large" sx={{ mt: 2, mb: 1 }}>
                Track management
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
                Send each track a "ready?" button (max 3 per WhatsApp message, split across messages). When a track
                manager taps their button it is marked ready; once every track is ready, a GO message is sent to the
                same chat.
            </Typography>

            <TextField
                margin="normal"
                fullWidth
                label="Shared chat (chatId ending with @c.us or @g.us)"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="120363xxxxxxxxxx@g.us"
                helperText="A group chatId ends with @g.us, a single contact with @c.us. A raw phone number (international format) is sent to @c.us automatically."
            />
            <Grid item xs={12}>
                <LoadingButton
                    onClick={start}
                    disabled={starting || chatId.trim().length === 0}
                    loading={starting}
                    variant="contained"
                    sx={{ mt: 1, mb: 2 }}>
                    Send track buttons
                </LoadingButton>
            </Grid>

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
                </Box>
            )}

            <Box mt={2}>
                <Typography variant="body2" gutterBottom>
                    GreenAPI webhook URL (set it in your instance settings so button taps are received)
                </Typography>
                <TypographyCopyable singleLine={true}>{webhookUrl}</TypographyCopyable>

                <Typography variant="body2" gutterBottom mt={2}>
                    Webhook Authorization header (set the same value in GreenAPI so taps are trusted)
                </Typography>
                <TypographyCopyable singleLine={true}>
                    {event.apiKey || '— generate an API key first'}
                </TypographyCopyable>
            </Box>
        </Card>
    )
}
