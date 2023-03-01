import * as React from 'react'
import { Button, Dialog, DialogContent, DialogContentText, DialogTitle, Link, Typography } from '@mui/material'

export type NewEventCreatedDialogProps = {
    eventId: string
    onClose: () => void
}
export const NewEventCreatedDialog = ({ onClose, eventId }: NewEventCreatedDialogProps) => {
    return (
        <>
            <Dialog open={true} onClose={() => onClose()}>
                <DialogTitle>Event created!</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <Typography variant="caption">Ouiiiiiiiiiiiiiiiiiiiiiiiiiii</Typography>
                        <br />
                        <br />
                        <Button component={Link} variant="contained" href={`/events/${eventId}`}>
                            Open event
                        </Button>
                    </DialogContentText>
                </DialogContent>
            </Dialog>
        </>
    )
}
