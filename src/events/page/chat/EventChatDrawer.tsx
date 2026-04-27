import * as React from 'react'
import { Alert, Box, Drawer, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { Event } from '../../../types'
import { ChatInput } from './ChatInput'
import { ChatMessages } from './ChatMessages'
import { useChatStream } from './useChatStream'
import { generateApiKey } from '../../../utils/generateApiKey'
import { updateEvent } from '../../actions/updateEvent'

export type EventChatDrawerProps = {
    event: Event
    open: boolean
    onClose: () => void
}

export const EventChatDrawer = ({ event, open, onClose }: EventChatDrawerProps) => {
    const [apiKey, setApiKey] = React.useState<string | null>(event.apiKey ?? null)
    const [provisioning, setProvisioning] = React.useState(false)
    const [provisioningError, setProvisioningError] = React.useState<string | null>(null)
    const { state, send, cancel, reset } = useChatStream(event.id, apiKey)

    React.useEffect(() => {
        if (!open || apiKey || provisioning) return
        let cancelled = false
        setProvisioning(true)
        setProvisioningError(null)
        ;(async () => {
            try {
                const generated = generateApiKey()
                await updateEvent(event.id, { apiKey: generated })
                if (!cancelled) setApiKey(generated)
            } catch (error) {
                if (!cancelled) {
                    setProvisioningError(
                        error instanceof Error
                            ? `Failed to provision an event API key: ${error.message}`
                            : 'Failed to provision an event API key.'
                    )
                }
            } finally {
                if (!cancelled) setProvisioning(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [open, apiKey, provisioning, event.id])

    // Closing the drawer should also stop any in-flight stream so we stop
    // burning OpenRouter tokens / CPU when the user dismisses the panel.
    const handleClose = React.useCallback(() => {
        cancel()
        onClose()
    }, [cancel, onClose])

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={handleClose}
            PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: 2,
                        py: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}>
                    <Box>
                        <Typography variant="h6">Event assistant</Typography>
                        <Typography variant="caption" color="text.secondary">
                            Read-only preview · {state.eventSummary?.sessionsCount ?? '·'} sessions ·{' '}
                            {state.eventSummary?.speakersCount ?? '·'} speakers
                        </Typography>
                    </Box>
                    <Box>
                        <IconButton size="small" onClick={reset} aria-label="Reset conversation" sx={{ mr: 0.5 }}>
                            <Typography variant="caption">Clear</Typography>
                        </IconButton>
                        <IconButton size="small" onClick={handleClose} aria-label="Close">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>

                <Alert severity="info" sx={{ m: 1 }}>
                    This assistant can read your event data but cannot make changes yet. Write support is coming in a
                    later version.
                </Alert>

                {!event.openRouterAPIKey && (
                    <Alert severity="warning" sx={{ mx: 1, mb: 1 }}>
                        OpenRouter API key not set. Add it in Event Settings → Other stuffs → OpenRouter API key.
                    </Alert>
                )}

                {provisioningError && (
                    <Alert severity="error" sx={{ mx: 1, mb: 1 }}>
                        {provisioningError}
                    </Alert>
                )}

                {state.error && (
                    <Alert severity="error" sx={{ mx: 1, mb: 1 }}>
                        {state.error}
                    </Alert>
                )}

                <ChatMessages turns={state.turns} streaming={state.streaming} />

                <ChatInput
                    streaming={state.streaming}
                    disabled={!apiKey || provisioning || !event.openRouterAPIKey}
                    onSend={send}
                    onCancel={cancel}
                />
            </Box>
        </Drawer>
    )
}
