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
import { addNewEvent } from './actions/addNewEvent'
import { useSelector } from 'react-redux'
import { selectUserIdConferenceCenter } from '../auth/authReducer'

export type NewEventDialogProps = {
    isOpen: boolean
    onClose: (eventId: string | null) => void
}

export const NewEventDialog = ({ isOpen, onClose }: NewEventDialogProps) => {
    const userId = useSelector(selectUserIdConferenceCenter)
    const [selectedConferenceHallEvent, setSelectedConferenceHallEvent] = useState<ConferenceHallEvent | null>(null)
    const [status, setStatus] = useState('')
    const [newResult, setNewResults] = useState<null | { eventId: string | null; errors: string[] }>(null)

    const hasErrors = (newResult?.errors || []).length > 0

    return (
        <Dialog open={isOpen} onClose={() => onClose(null)} maxWidth="md">
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

                {(!newResult || hasErrors) && (
                    <RequireConferenceHallLogin>
                        {(conferenceHallUserId) => {
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
                                            userId={conferenceHallUserId}
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
                                                    setNewResults(null)
                                                    const result = await addNewEvent(
                                                        selectedConferenceHallEvent,
                                                        userId,
                                                        proposals,
                                                        setStatus
                                                    )
                                                    setNewResults({
                                                        eventId: result[0],
                                                        errors: result[1],
                                                    })
                                                    if (result[1].length === 0) {
                                                        onClose(result[0])
                                                    }
                                                    return null
                                                }}
                                            />
                                            <Typography variant="body1">{status}</Typography>
                                        </>
                                    )}
                                </>
                            )
                        }}
                    </RequireConferenceHallLogin>
                )}

                {hasErrors && newResult && (
                    <>
                        <Typography variant="h6">Error during creation: </Typography>
                        <ul>
                            {newResult.errors.map((error) => (
                                <li>
                                    <Typography>{error}</Typography>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(newResult?.eventId || null)}>Cancel</Button>
            </DialogActions>
        </Dialog>
    )
}
