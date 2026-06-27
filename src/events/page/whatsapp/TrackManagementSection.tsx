import { useCallback, useEffect, useState } from 'react'
import { Box, Card, Chip, Grid, Stack, TextField, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { doc, updateDoc } from 'firebase/firestore'
import { Event } from '../../../types'
import { fetchOpenPlannerApi } from '../../../services/hooks/useOpenPlannerApi'
import { useNotification } from '../../../hooks/notificationHook'
import { TypographyCopyable } from '../../../components/TypographyCopyable'
import { collections } from '../../../services/firebase'
import { API_URL } from '../../../env'

type TrackStatus = { id: string; name: string; ready: boolean }
type SessionStatus = {
    chatId: string | null
    tracks: TrackStatus[]
    goSent: boolean
}

// API_URL may or may not carry a trailing slash; normalise so the URL is always well-formed.
const apiBase = String(API_URL ?? '').replace(/\/+$/, '')

export const TrackManagementSection = ({ event }: { event: Event }) => {
    // Event-scoped webhook so GreenAPI posts straight to this event's endpoint.
    const webhookUrl = `${apiBase}/v1/${event.id}/whatsapp/webhook`
    const { createNotification } = useNotification()
    // Seed from the saved event setting so the operator doesn't retype it.
    const [chatId, setChatId] = useState(event.whatsappSharedChatId || '')
    const [starting, setStarting] = useState(false)
    const [savingChat, setSavingChat] = useState(false)
    const [status, setStatus] = useState<SessionStatus | null>(null)

    const saveSharedChat = async () => {
        setSavingChat(true)
        try {
            await updateDoc(doc(collections.events, event.id), { whatsappSharedChatId: chatId.trim() || null })
            createNotification('Shared chat saved', { type: 'success' })
        } catch (error) {
            createNotification('Failed to save chat: ' + (error instanceof Error ? error.message : 'Unknown error'), {
                type: 'error',
            })
        } finally {
            setSavingChat(false)
        }
    }

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

    const [configuring, setConfiguring] = useState(false)
    const configureWebhook = async () => {
        setConfiguring(true)
        try {
            await fetchOpenPlannerApi(event, 'whatsapp/configure-webhook', {
                method: 'POST',
                body: { webhookUrl },
            })
            createNotification('GreenAPI webhook configured (the instance may reboot for a few minutes)', {
                type: 'success',
            })
        } catch (error) {
            createNotification(
                'Failed to configure webhook: ' + (error instanceof Error ? error.message : 'Unknown error'),
                { type: 'error' }
            )
        } finally {
            setConfiguring(false)
        }
    }

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

    const trackList = status?.tracks ?? []
    const readyCount = trackList.filter((t) => t.ready).length
    const total = trackList.length

    return (
        <Card sx={{ paddingX: 2, mt: 4, mb: 2 }}>
            <Typography fontSize="large" sx={{ mt: 2, mb: 1 }}>
                Track management
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
                Send a WhatsApp poll listing the tracks (up to 12 options per poll). When a track manager taps their
                track in the poll it is marked ready; once every track is ready, a GO message is sent to the same chat.
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
            <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2 }}>
                <LoadingButton onClick={saveSharedChat} disabled={savingChat} loading={savingChat} variant="outlined">
                    Save chat
                </LoadingButton>
                <LoadingButton
                    onClick={start}
                    disabled={starting || chatId.trim().length === 0}
                    loading={starting}
                    variant="contained">
                    Send track poll
                </LoadingButton>
            </Stack>

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
                <Typography variant="subtitle2" gutterBottom>
                    Webhook (required to receive poll votes)
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1}>
                    Click to point your GreenAPI instance at this app automatically (sets the URL, the auth token and
                    enables incoming notifications). The instance may reboot for a few minutes afterwards.
                </Typography>
                <LoadingButton
                    onClick={configureWebhook}
                    disabled={configuring || !event.apiKey}
                    loading={configuring}
                    variant="outlined"
                    sx={{ mb: 2 }}>
                    Configure GreenAPI webhook
                </LoadingButton>

                <Typography variant="body2" gutterBottom>
                    Or set these manually in GreenAPI — webhook URL:
                </Typography>
                <TypographyCopyable singleLine={true}>{webhookUrl}</TypographyCopyable>
                <Typography variant="body2" gutterBottom mt={2}>
                    and Authorization token (webhookUrlToken):
                </Typography>
                <TypographyCopyable singleLine={true}>
                    {event.apiKey || '— generate an API key first'}
                </TypographyCopyable>
            </Box>
        </Card>
    )
}
