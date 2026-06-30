import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { Event } from '../../../types'
import { fetchOpenPlannerApi } from '../../../services/hooks/useOpenPlannerApi'
import { useNotification } from '../../../hooks/notificationHook'
import { TypographyCopyable } from '../../../components/TypographyCopyable'
import { API_URL } from '../../../env'

// API_URL may or may not carry a trailing slash; normalise so the URL is always well-formed.
const apiBase = String(API_URL ?? '').replace(/\/+$/, '')

export type WhatsAppWebhookSetupProps = {
    event: Event
}

// GreenAPI webhook wiring (required so poll votes reach this app). Auto-config button + manual fallback.
export const WhatsAppWebhookSetup = ({ event }: WhatsAppWebhookSetupProps) => {
    const { createNotification } = useNotification()
    // Event-scoped webhook so GreenAPI posts straight to this event's endpoint.
    const webhookUrl = `${apiBase}/v1/${event.id}/whatsapp/webhook`
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

    return (
        <Box>
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
            <TypographyCopyable singleLine={true}>{event.apiKey || '— generate an API key first'}</TypographyCopyable>
        </Box>
    )
}
