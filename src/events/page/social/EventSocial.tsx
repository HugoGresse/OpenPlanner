import { useState } from 'react'
import {
    Box,
    Button,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
    CircularProgress,
    Alert,
} from '@mui/material'
import { useBupherAuth } from '../../../services/hooks/useBupherAuth'

export type EventSocialProps = {
    eventId: string
}

export const EventSocial = ({ eventId }: EventSocialProps) => {
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const { isLoggedIn, isLoading, error, login, logout } = useBupherAuth(eventId)

    const handleLogin = async () => {
        const success = await login(email, password)
        if (success) {
            setIsLoginDialogOpen(false)
            setEmail('')
            setPassword('')
        }
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h2" gutterBottom>
                Social Media Management
            </Typography>

            <Dialog open={isLoginDialogOpen && !isLoggedIn} onClose={() => setIsLoginDialogOpen(false)}>
                <DialogTitle>Login to Bupher</DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Box
                        component="form"
                        sx={{ mt: 2 }}
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleLogin()
                        }}>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Email"
                            type="email"
                            fullWidth
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                        />
                        <TextField
                            margin="dense"
                            label="Password"
                            type="password"
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsLoginDialogOpen(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleLogin}
                        variant="contained"
                        disabled={isLoading || !email || !password}
                        startIcon={isLoading ? <CircularProgress size={20} /> : null}>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </Button>
                </DialogActions>
            </Dialog>

            {isLoggedIn ? (
                <Box>
                    <Alert severity="success" sx={{ mb: 2 }}>
                        You are logged in to Bupher!
                    </Alert>
                    <Button variant="outlined" onClick={logout}>
                        Logout
                    </Button>
                </Box>
            ) : (
                <Button variant="contained" onClick={() => setIsLoginDialogOpen(true)}>
                    Login to Bupher
                </Button>
            )}
        </Container>
    )
}
