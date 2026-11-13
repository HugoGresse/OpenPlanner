import { useState } from 'react'
import { Box, Grid, TextField, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { Event } from '../../../types'
import { fetchOpenPlannerApi } from '../../../services/hooks/useOpenPlannerApi'
import { useNotification } from '../../../hooks/notificationHook'
import { WhatsAppChatPicker } from './WhatsAppChatPicker'

export type WhatsAppTestMessageProps = {
    event: Event
}

// One-off WhatsApp message to confirm the GreenAPI credentials actually work.
export const WhatsAppTestMessage = ({ event }: WhatsAppTestMessageProps) => {
    const { createNotification } = useNotification()
    const [to, setTo] = useState('')
    const [message, setMessage] = useState('Test message from OpenPlanner ✅')
    const [sending, setSending] = useState(false)

    const sendTest = async () => {
        setSending(true)
        try {
            await fetchOpenPlannerApi(event, 'whatsapp/send-test', {
                method: 'POST',
                body: { to, message },
            })
            createNotification('WhatsApp message sent', { type: 'success' })
        } catch (error) {
            createNotification('Failed to send: ' + (error instanceof Error ? error.message : 'Unknown error'), {
                type: 'error',
            })
        } finally {
            setSending(false)
        }
    }

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
                Send one WhatsApp message to check the setup. Pick a contact below, or type a number in international
                format (country code included), e.g. <code>+33612345678</code>.
            </Typography>
            <WhatsAppChatPicker
                event={event}
                value={to}
                onChange={setTo}
                filterType="all"
                label="Recipient (contact, group or phone number)"
            />
            <TextField
                margin="normal"
                fullWidth
                multiline
                minRows={2}
                label="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
            />
            <Grid item xs={12}>
                <LoadingButton
                    onClick={sendTest}
                    disabled={sending || to.trim().length === 0 || message.trim().length === 0}
                    loading={sending}
                    variant="contained"
                    sx={{ mt: 2, mb: 2 }}>
                    Send test message
                </LoadingButton>
            </Grid>
        </Box>
    )
}
