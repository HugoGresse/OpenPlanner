import * as React from 'react'
import { Box, IconButton, TextField } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import StopIcon from '@mui/icons-material/Stop'

export type ChatInputProps = {
    streaming: boolean
    disabled?: boolean
    onSend: (message: string) => void
    onCancel: () => void
}

export const ChatInput = ({ streaming, disabled, onSend, onCancel }: ChatInputProps) => {
    const [value, setValue] = React.useState('')

    const submit = () => {
        const trimmed = value.trim()
        if (!trimmed || streaming || disabled) return
        onSend(trimmed)
        setValue('')
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 1,
                p: 1.5,
                borderTop: '1px solid',
                borderColor: 'divider',
            }}>
            <TextField
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        submit()
                    }
                }}
                placeholder={disabled ? 'No API key available for this event' : 'Ask about your event…'}
                multiline
                maxRows={6}
                fullWidth
                size="small"
                disabled={disabled}
            />
            {streaming ? (
                <IconButton color="error" onClick={onCancel} aria-label="Stop">
                    <StopIcon />
                </IconButton>
            ) : (
                <IconButton color="primary" onClick={submit} disabled={!value.trim() || disabled} aria-label="Send">
                    <SendIcon />
                </IconButton>
            )}
        </Box>
    )
}
