import * as React from 'react'
import { Alert, Box, Drawer, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { Event } from '../../../types'
import { ChatInput } from './ChatInput'
import { ChatMessages } from './ChatMessages'
import { ChatSetupPanel } from './ChatSetupPanel'
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
    // Track the OpenRouter key locally so the setup panel can flip the drawer
    // into chat mode the moment the user saves a valid key, without waiting
    // for the parent component to re-fetch the event doc from Firestore.
    const [openRouterKeyConfigured, setOpenRouterKeyConfigured] = React.useState<boolean>(!!event.openRouterAPIKey)
    React.useEffect(() => {
        setOpenRouterKeyConfigured(!!event.openRouterAPIKey)
    }, [event.openRouterAPIKey])
    const { state, send, cancel, reset, applyProposal, rejectProposal, applyAllProposals, rejectAllProposals } =
        useChatStream(event.id, apiKey)

    React.useEffect(() => {
        // Only auto-provision the OpenPlanner apiKey when the user is past the
        // setup step. No point creating one before they've added an OpenRouter
        // key (which they may decide not to do at all).
        if (!open || apiKey || provisioning || !openRouterKeyConfigured) return
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
    }, [open, apiKey, provisioning, openRouterKeyConfigured, event.id])

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

                {openRouterKeyConfigured ? (
                    <>
                        <Alert severity="info" sx={{ m: 1 }}>
                            The assistant proposes changes that you must explicitly approve. Nothing is written to the
                            event until you click <strong>Apply</strong> on a proposal card.
                        </Alert>

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

                        <ChatMessages
                            turns={state.turns}
                            streaming={state.streaming}
                            proposals={state.proposals}
                            onApplyProposal={applyProposal}
                            onRejectProposal={rejectProposal}
                            onApplyAllProposals={applyAllProposals}
                            onRejectAllProposals={rejectAllProposals}
                        />

                        <ChatInput
                            streaming={state.streaming}
                            disabled={!apiKey || provisioning}
                            onSend={send}
                            onCancel={cancel}
                        />
                    </>
                ) : (
                    <ChatSetupPanel event={event} onSaved={() => setOpenRouterKeyConfigured(true)} />
                )}
            </Box>
        </Drawer>
    )
}
