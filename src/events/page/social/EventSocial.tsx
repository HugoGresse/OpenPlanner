import { useEffect, useState } from 'react'
import { Box, Button, Container, Typography, Alert } from '@mui/material'
import { useBupherAuth } from '../../../services/bupher/useBupherAuth'
import { BUHPER_NAME } from './bupherName'
import { BupherLoginDialog } from './BupherLoginDialog'
import { Event } from '../../../types'
import { BupherChannels } from './BupherChannels'
import { BupherScheduledPosts } from './BupherScheduledPosts'
import { TestBupherDraftPost } from './TestBupherDraftPost'
export type EventSocialProps = {
    event: Event
}

export const EventSocial = ({ event }: EventSocialProps) => {
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false)
    const [postComponentId, setPostComponentId] = useState<string | null>(null)
    const { isLoggedIn, isLoading, error, login, logout } = useBupherAuth(event)

    useEffect(() => {
        if (!isLoading && isLoggedIn && !error) {
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
                        <BupherScheduledPosts event={event} key={postComponentId} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <BupherChannels event={event} />
                        <TestBupherDraftPost
                            event={event}
                            refreshPosts={() => setPostComponentId(Date.now().toString())}
                        />
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
