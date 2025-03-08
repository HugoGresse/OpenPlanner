import { useEffect, useState } from 'react'
import { Box, Button, Container, Typography, Alert } from '@mui/material'
import { useBupherAuth } from '../../../services/bupher/useBupherAuth'
import { BUHPER_NAME } from './bupherName'
import { BupherLoginDialog } from './BupherLoginDialog'
import { Event } from '../../../types'
import { BupherChannels } from './BupherChannels'

export type EventSocialProps = {
    event: Event
}

export const EventSocial = ({ event }: EventSocialProps) => {
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false)
    const { isLoggedIn, isLoading, error, login, logout } = useBupherAuth(event)

    useEffect(() => {
        if (!isLoading && isLoggedIn) {
            setIsLoginDialogOpen(false)
        }
    }, [isLoggedIn, isLoading])

    const handleLogin = async (email: string, password: string) => {
        return await login(email, password)
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography gutterBottom>Manage your social publication right from OpenPlanner.</Typography>

            <BupherLoginDialog
                open={isLoginDialogOpen && !isLoggedIn}
                onClose={() => setIsLoginDialogOpen(false)}
                onLogin={handleLogin}
                isLoading={isLoading}
                error={error}
            />

            {isLoggedIn ? (
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <Alert severity="success" sx={{ mb: 2 }}>
                            You are logged in to {BUHPER_NAME}!{'  '}
                            <Button variant="outlined" onClick={logout}>
                                Logout
                            </Button>
                        </Alert>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <BupherChannels event={event} />
                    </Box>
                </Box>
            ) : (
                <Button variant="contained" onClick={() => setIsLoginDialogOpen(true)}>
                    Login to {BUHPER_NAME}
                </Button>
            )}
        </Container>
    )
}
