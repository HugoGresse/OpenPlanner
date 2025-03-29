import { useState } from 'react'
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    CircularProgress,
    Alert,
} from '@mui/material'
import { BUHPER_NAME } from './bupherName'

export type BupherLoginDialogProps = {
    open: boolean
    onClose: () => void
    onLogin: (email: string, password: string) => Promise<boolean>
    isLoading: boolean
    error: string | null
}

export const BupherLoginDialog = ({ open, onClose, onLogin, isLoading, error }: BupherLoginDialogProps) => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async () => {
        const success = await onLogin(email, password)
        if (success) {
            setEmail('')
            setPassword('')
        }
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Login to {BUHPER_NAME}</DialogTitle>
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
                <Button onClick={onClose} disabled={isLoading}>
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
    )
}
