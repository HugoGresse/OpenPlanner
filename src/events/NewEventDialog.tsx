import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography,
} from '@mui/material'
import * as React from 'react'
import { useState } from 'react'
import { RequireConferenceHallLogin } from '../conferencehall/RequireConferenceHallLogin'
import { ConferenceHallEventsPicker } from '../conferencehall/ConferenceHallEventsPicker'
import { ConferenceHallEvent } from '../types'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { ConferenceHallProposalsPicker } from '../conferencehall/components/ConferenceHallProposalsPicker'

export type NewEventDialogProps = {
    isOpen: boolean
    onClose: () => void
}

export const NewEventDialog = ({ isOpen, onClose }: NewEventDialogProps) => {
    const [selectedConferenceHallEvent, setSelectedConferenceHallEvent] = useState<ConferenceHallEvent | null>(null)
    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="md">
            <DialogTitle>Import a new event from Conference Hall</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    To import an event from ConferenceHall.io, we first need to log in into ConferenceHall on your
                    behalf. This is done client side, no credentials will be sent to our servers.
                </DialogContentText>

                <Box display="flex" alignItems="center" marginY={2}>
                    <Typography variant="h4">1. Login with Conference-Hall.io</Typography>
                    <img src="/public/logos/conference-hall.png" alt="conference hall logo" width={70} />
                </Box>

                <RequireConferenceHallLogin>
                    {(userId) => {
                        return (
                            <>
                                <Box display="flex" alignItems="center" marginY={2}>
                                    <Typography variant="h4">2. Select the event you want to import</Typography>
                                </Box>
                                {selectedConferenceHallEvent ? (
                                    <Typography variant="body1" sx={{ display: 'flex' }}>
                                        <CheckCircleOutlineIcon color="success" /> Selected ConferenceHall event:{' '}
                                        {selectedConferenceHallEvent.name}
                                    </Typography>
                                ) : (
                                    <ConferenceHallEventsPicker
                                        onEventPicked={(event) => setSelectedConferenceHallEvent(event)}
                                        userId={userId}
                                    />
                                )}
                                {selectedConferenceHallEvent && (
                                    <>
                                        <Box display="flex" alignItems="center" marginY={2}>
                                            <Typography variant="h4">
                                                3. Select the proposals to import (optional)
                                            </Typography>
                                        </Box>
                                        <ConferenceHallProposalsPicker
                                            eventId={selectedConferenceHallEvent.id}
                                            onSubmit={async (proposals) => {
                                                console.log('proposals selected', proposals)

                                                return new Promise((resolve) => {
                                                    setTimeout(resolve, 3000)
                                                })
                                            }}
                                        />
                                    </>
                                )}
                            </>
                        )
                    }}
                </RequireConferenceHallLogin>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
            </DialogActions>
        </Dialog>
    )
}
