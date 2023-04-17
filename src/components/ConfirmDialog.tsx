import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import * as React from 'react'
import { LoadingButton } from '@mui/lab'

export type ConfirmDialogProps = {
    open: boolean
    handleClose: () => void
    title: string | undefined
    acceptButton: string
    cancelButton: string
    handleAccept: () => void
    disabled?: boolean
    loading?: boolean
    children: React.ReactNode
    autoFocus?: boolean
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
}: ConfirmDialogProps) => {
    return (
        <Dialog
            open={open}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description">
            <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
            <DialogContent>{children}</DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{cancelButton}</Button>
                <LoadingButton
                    onClick={handleAccept}
                    disabled={disabled}
                    loading={loading}
                    autoFocus
                    variant="contained">
                    {acceptButton}
                </LoadingButton>
            </DialogActions>
        </Dialog>
    )
}
