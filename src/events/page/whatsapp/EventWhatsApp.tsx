import { useState } from 'react'
import { Box, Button, Card, Container, Stack, Typography } from '@mui/material'
import { Settings as SettingsIcon } from '@mui/icons-material'
import { Event } from '../../../types'
import { TrackManagementSection } from './TrackManagementSection'
import { WhatsAppConfigModal } from './WhatsAppConfigModal'

export type EventWhatsAppProps = {
    event: Event
}

export const EventWhatsApp = ({ event }: EventWhatsAppProps) => {
    const isConfigured = Boolean(event.greenApiInstanceId && event.greenApiToken)

    // Open the config modal straight away on first setup so the operator can't miss it.
    const [configOpen, setConfigOpen] = useState(!isConfigured)

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography component="h1" variant="h5">
                    WhatsApp (track management)
                </Typography>
                <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => setConfigOpen(true)}>
                    Configuration
                </Button>
            </Stack>

            {isConfigured ? (
                <TrackManagementSection event={event} />
            ) : (
                <Card sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        WhatsApp isn't configured yet. Add your GreenAPI credentials and shared chat in the{' '}
                        <Box
                            component="span"
                            sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => setConfigOpen(true)}>
                            configuration
                        </Box>{' '}
                        to start managing tracks.
                    </Typography>
                </Card>
            )}

            <WhatsAppConfigModal open={configOpen} onClose={() => setConfigOpen(false)} event={event} />
        </Container>
    )
}
