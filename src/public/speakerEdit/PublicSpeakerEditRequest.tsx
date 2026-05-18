import * as React from 'react'
import { useState } from 'react'
import { Alert, Box, Button, Container, Paper, TextField, Typography } from '@mui/material'
import { API_URL } from '../../env'
import { CapWidget } from './CapWidget'

export type PublicSpeakerEditRequestProps = {
    eventId: string
}

export const PublicSpeakerEditRequest = ({ eventId }: PublicSpeakerEditRequestProps) => {
    const [email, setEmail] = useState('')
    const [captchaToken, setCaptchaToken] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!captchaToken) {
            setError('Please complete the captcha')
            return
        }
        if (!email) return
        setSubmitting(true)
        setError(null)
        try {
            const url = new URL(API_URL as string)
            url.pathname += `v1/${eventId}/speakers/request-edit-link`
            const response = await fetch(url.href, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    captchaToken,
                    publicBaseUrl: window.location.origin,
                }),
            })
            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                setError(body.error || 'Request failed')
                return
            }
            setSubmitted(true)
        } catch (err) {
            console.error(err)
            setError('Request failed')
        } finally {
            setSubmitting(false)
        }
    }

    if (submitted) {
        return (
            <Container maxWidth="sm" sx={{ mt: 6 }}>
                <Paper sx={{ p: 4 }}>
                    <Typography variant="h5" mb={2}>
                        Check your inbox
                    </Typography>
                    <Typography color="text.secondary">
                        If your email matches a speaker for this event, we have sent you a magic link to edit your
                        public profile. The link is valid for 7 days. Please also check your spam folder.
                    </Typography>
                </Paper>
            </Container>
        )
    }

    return (
        <Container maxWidth="sm" sx={{ mt: 6 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h5" mb={1}>
                    Edit your speaker profile
                </Typography>
                <Typography color="text.secondary" mb={3}>
                    Enter the email registered with the event. We will send you a magic link to edit your public
                    profile. Edits are reviewed by an administrator before going live.
                </Typography>
                <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        required
                        type="email"
                        label="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={submitting}
                        sx={{ mb: 2 }}
                    />
                    <Box sx={{ mb: 2 }}>
                        <CapWidget onSolve={setCaptchaToken} onReset={() => setCaptchaToken(null)} />
                    </Box>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={submitting || !captchaToken || !email}>
                        Send magic link
                    </Button>
                </Box>
            </Paper>
        </Container>
    )
}
