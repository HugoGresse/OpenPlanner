import { Button, Dialog, DialogActions, DialogContent, DialogTitle, DialogProps } from '@mui/material'
import * as React from 'react'
import { LoadingButton } from '@mui/lab'

export type ConfirmDialogProps = {
    open: boolean
    handleClose: () => void
    title: string | undefined
    acceptButton?: string
    cancelButton: string
    handleAccept: () => void
    disabled?: boolean
    loading?: boolean
    children: React.ReactNode
    autoFocus?: boolean
    fullWidth?: boolean
    maxWidth?: DialogProps['maxWidth']
}
export const ConfirmDialog = ({
    open,
    handleClose,
    title,
    children,
    acceptButton,
    cancelButton,
    handleAccept,
    disabled,
    loading,
    fullWidth,
    maxWidth,
}: ConfirmDialogProps) => {
    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth={fullWidth}
            maxWidth={maxWidth}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description">
            <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
            <DialogContent>{children}</DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{cancelButton}</Button>
                {acceptButton && (
                    <LoadingButton
                        onClick={handleAccept}
                        disabled={disabled}
                        loading={loading}
                        autoFocus
                        variant="contained">
                        {acceptButton}
                    </LoadingButton>
                )}
            </DialogActions>
        </Dialog>
    )
}
