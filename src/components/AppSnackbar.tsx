import { CloseOutlined } from '@mui/icons-material'
import { AlertColor, Button, Grow, IconButton, Snackbar, SnackbarProps } from '@mui/material'
import { forwardRef, PropsWithChildren, SyntheticEvent } from 'react'
import MuiAlert, { AlertProps } from '@mui/material/Alert'

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
    return <MuiAlert ref={ref} variant="filled" {...props} />
})

export type AppSnackbarType = AlertColor

type AppSnackbarProps = {
    message: string
    type?: AppSnackbarType
    handleClose: (event: SyntheticEvent | Event) => void
} & SnackbarProps

export const AppSnackbar = ({ message, type, handleClose, ...props }: AppSnackbarProps) => {
    return (
        <Snackbar
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            onClose={handleClose}
            TransitionComponent={Grow}
            {...props}>
            <Alert severity={type ?? 'info'} sx={{ width: '100%' }} onClose={handleClose}>
                {message}
            </Alert>
        </Snackbar>
    )
}
