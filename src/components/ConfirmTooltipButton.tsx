import {
    Button,
    ButtonProps,
    ClickAwayListener,
    IconButton,
    IconButtonProps,
    Paper,
    Tooltip,
    Typography,
} from '@mui/material'
import React, { useState } from 'react'

type BaseButtonProps = {
    confirmMessage: string
    confirmButtonText?: string
    buttonType?: 'button' | 'iconButton'
}

type ConditionalProps =
    | ({ buttonType?: 'button' } & Omit<ButtonProps, 'title'>)
    | ({ buttonType: 'iconButton' } & Omit<IconButtonProps, 'title'>)

type ConfirmTooltipButtonProps = BaseButtonProps & ConditionalProps

export const ConfirmTooltipButton: React.FC<ConfirmTooltipButtonProps> = ({
    confirmMessage,
    confirmButtonText,
    buttonType = 'button',
    onClick,
    children,
    ...buttonProps
}) => {
    const [open, setOpen] = useState(false)

    const handleClick = () => {
        if (!open) {
            setOpen(true)
        }
    }

    const handleConfirm = (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        setOpen(false)
    }

    const handleClose = () => {
        setOpen(false)
    }

    return (
        <ClickAwayListener onClickAway={handleClose}>
            <Tooltip
                PopperProps={{
                    disablePortal: true,
                    sx: {
                        '& .MuiTooltip-tooltip': {
                            bgcolor: 'transparent',
                            p: 0,
                        },
                    },
                }}
                open={open}
                disableFocusListener
                disableHoverListener
                disableTouchListener
                title={
                    <Paper elevation={3} sx={{ p: 2, minWidth: '200px' }}>
                        <Typography variant="body1" style={{ marginBottom: '12px', color: 'text.primary' }}>
                            {confirmMessage}
                        </Typography>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Button size="small" onClick={handleClose} variant="outlined">
                                Cancel
                            </Button>
                            <Button size="small" onClick={handleConfirm} variant="contained" color="primary" autoFocus>
                                {confirmButtonText || 'Confirm'}
                            </Button>
                        </div>
                    </Paper>
                }>
                {buttonType === 'iconButton' ? (
                    <IconButton {...(buttonProps as IconButtonProps)} onClick={handleClick}>
                        {children}
                    </IconButton>
                ) : (
                    <Button {...(buttonProps as ButtonProps)} onClick={handleClick}>
                        {children}
                    </Button>
                )}
            </Tooltip>
        </ClickAwayListener>
    )
}
