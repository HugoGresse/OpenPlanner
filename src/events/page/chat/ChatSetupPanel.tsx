import * as React from 'react'
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    InputAdornment,
    IconButton,
    Link,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { Event } from '../../../types'
import { updateEvent } from '../../actions/updateEvent'

export type ChatSetupPanelProps = {
    event: Event
    onSaved: (apiKey: string) => void
}

const OPENROUTER_AUTH_KEY_URL = 'https://openrouter.ai/api/v1/auth/key'

const looksLikeOpenRouterKey = (value: string) => /^sk-or-[\w-]{10,}$/i.test(value.trim())

const validateAgainstOpenRouter = async (key: string): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
        const res = await fetch(OPENROUTER_AUTH_KEY_URL, {
            method: 'GET',
            headers: { Authorization: `Bearer ${key}` },
        })
        if (res.status === 401 || res.status === 403) {
            return { ok: false, error: 'OpenRouter rejected this key (unauthorized).' }
        }
        if (!res.ok) {
            const text = await res.text().catch(() => '')
            return {
                ok: false,
                error: `OpenRouter responded with ${res.status}: ${text || res.statusText}`,
            }
        }
        return { ok: true }
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Could not reach OpenRouter.',
        }
    }
}

export const ChatSetupPanel = ({ event, onSaved }: ChatSetupPanelProps) => {
    const [value, setValue] = React.useState('')
    const [revealed, setRevealed] = React.useState(false)
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const formatLooksOk = looksLikeOpenRouterKey(value)
    const submitDisabled = busy || value.trim().length === 0

    const handleSave = async () => {
        const trimmed = value.trim()
        if (!trimmed) return
        setBusy(true)
        setError(null)
        try {
            const result = await validateAgainstOpenRouter(trimmed)
            if (!result.ok) {
                setError(result.error)
                return
            }
            await updateEvent(event.id, { openRouterAPIKey: trimmed })
            onSaved(trimmed)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save the API key.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
                Set up the OpenPlanner assistant
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
                The assistant lets you ask questions about <strong>{event.name}</strong> and propose edits in plain
                English. Every change is shown as a diff that you explicitly approve before anything is written.
            </Typography>

            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                What it can do
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0, mb: 2, '& li': { mb: 0.5 } }}>
                <Typography component="li" variant="body2">
                    Read your event data — sessions, speakers, sponsors, FAQ, event settings.
                </Typography>
                <Typography component="li" variant="body2">
                    Propose patches to speakers (incl. private fields like email/phone), sessions, and event-level
                    settings.
                </Typography>
                <Typography component="li" variant="body2">
                    Propose deletions (speakers).
                </Typography>
                <Typography component="li" variant="body2">
                    Batch related changes — review and apply them all at once.
                </Typography>
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                What it never does
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0, mb: 2, '& li': { mb: 0.5 } }}>
                <Typography component="li" variant="body2">
                    Write any change without your explicit approval.
                </Typography>
                <Typography component="li" variant="body2">
                    See your event's API keys, transcription password, or sponsor management tokens.
                </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
                The assistant runs through{' '}
                <Link href="https://openrouter.ai" target="_blank" rel="noopener noreferrer">
                    OpenRouter
                </Link>
                . You bring your own API key — billing happens directly on your OpenRouter account, not OpenPlanner. The
                key is stored on this event document and only the OpenPlanner backend reads it.
            </Alert>

            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Get a key
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
                Sign in at{' '}
                <Link href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
                    openrouter.ai/keys
                </Link>
                , click <strong>Create key</strong>, copy the value (starts with <code>sk-or-…</code>) and paste it
                below.
            </Typography>

            <Stack spacing={1.5}>
                <TextField
                    label="OpenRouter API key"
                    placeholder="sk-or-v1-…"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    type={revealed ? 'text' : 'password'}
                    autoComplete="off"
                    autoFocus
                    fullWidth
                    size="small"
                    disabled={busy}
                    error={value.length > 0 && !formatLooksOk}
                    helperText={
                        value.length === 0
                            ? 'We will validate the key with OpenRouter before saving.'
                            : formatLooksOk
                            ? "Format looks right. We'll verify with OpenRouter when you save."
                            : 'Expected format: sk-or-… Make sure you copied the full key.'
                    }
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    size="small"
                                    onClick={() => setRevealed((r) => !r)}
                                    aria-label={revealed ? 'Hide API key' : 'Show API key'}
                                    edge="end">
                                    {revealed ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !submitDisabled) {
                            e.preventDefault()
                            handleSave()
                        }
                    }}
                />

                {error && <Alert severity="error">{error}</Alert>}

                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={submitDisabled}
                    startIcon={busy ? <CircularProgress size={16} /> : null}>
                    {busy ? 'Verifying…' : 'Save and start chatting'}
                </Button>

                <Typography variant="caption" color="text.secondary">
                    You can change or remove the key later under Event Settings → Other stuffs → OpenRouter API key.
                </Typography>
            </Stack>
        </Box>
    )
}
