import { useState } from 'react'
import {
    Box,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Alert,
    Chip,
    Tooltip,
} from '@mui/material'
import { Key as KeyIcon } from '@mui/icons-material'
import { Sponsor, Event } from '../../../../types'
import { fetchOpenPlannerApi } from '../../../../services/hooks/useOpenPlannerApi'
import { TypographyCopyable } from '../../../../components/TypographyCopyable'

export type SponsorTokenManagerProps = {
    sponsor: Sponsor
    categoryId: string
    event: Event
}

export const SponsorTokenManager = ({ sponsor, categoryId, event }: SponsorTokenManagerProps) => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState('')
    const [token, setToken] = useState(sponsor.jobPostToken || '')

    const generateToken = async () => {
        setIsGenerating(true)
        setError('')

        try {
            const data = await fetchOpenPlannerApi<{ token: string }>(event, 'sponsors/generate-token', {
                method: 'POST',
                body: {
                    sponsorId: sponsor.id,
                    categoryId: categoryId,
                },
            })
            setToken(data.token)
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to generate token')
        } finally {
            setIsGenerating(false)
        }
    }

    const jobManagementUrl = token
        ? `${window.location.origin}/public/event/${event.id}/jobsSponsors?token=${token}`
        : ''

    return (
        <>
            <Tooltip title="Manage job post access">
                <IconButton size="small" onClick={() => setDialogOpen(true)} sx={{ color: 'primary.main' }}>
                    <KeyIcon />
                </IconButton>
            </Tooltip>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Job Post Access for {sponsor.name}</DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="textSecondary" paragraph>
                            Generate a unique link for this sponsor to manage their job posts. This link allows them to:
                        </Typography>
                        <ul>
                            <li>Add new job posts</li>
                            <li>Edit existing job posts</li>
                            <li>Delete their job posts</li>
                        </ul>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Current Status:
                        </Typography>
                        {token ? (
                            <Chip label="Token Generated" color="success" />
                        ) : (
                            <Chip label="No Token" color="default" />
                        )}
                    </Box>

                    {token && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Job Management URL:
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                                <TypographyCopyable>{jobManagementUrl}</TypographyCopyable>
                            </Box>
                        </Box>
                    )}

                    <Box sx={{ mt: 3 }}>
                        <Typography variant="body2" color="warning.main">
                            <strong>Important:</strong> Keep this URL secure and only share it with the intended
                            sponsor. Anyone with this URL can manage this sponsor's job posts.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Close</Button>
                    <Button onClick={generateToken} variant="contained" disabled={isGenerating}>
                        {isGenerating ? 'Generating...' : token ? 'Regenerate Token' : 'Generate Token'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
