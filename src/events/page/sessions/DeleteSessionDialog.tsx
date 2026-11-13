import { DialogContentText } from '@mui/material'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Session } from '../../../types'

export type DeleteSessionDialogProps = {
    open: boolean
    loading: boolean
    session: Session
    onClose: () => void
    onAccept: () => void
}

export const DeleteSessionDialog = ({ open, loading, session, onClose, onAccept }: DeleteSessionDialogProps) => {
    return (
        <ConfirmDialog
            open={open}
            title="Delete this session?"
            acceptButton="Delete session"
            disabled={loading}
            loading={loading}
            cancelButton="cancel"
            handleClose={onClose}
            handleAccept={onAccept}>
            <DialogContentText id="alert-dialog-description">
                {' '}
                Delete the session {session.title} from this event (not the session's speaker(s))
            </DialogContentText>
        </ConfirmDialog>
    )
}
