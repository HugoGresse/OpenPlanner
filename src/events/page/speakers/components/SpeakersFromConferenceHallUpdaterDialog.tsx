import * as React from 'react'
import { useState } from 'react'
import { RequireConferenceHallLogin } from '../../../../conferencehall/RequireConferenceHallLogin'
import { Event, Speaker } from '../../../../types'
import { Dialog, DialogContent, Typography } from '@mui/material'
import { useNotification } from '../../../../hooks/notificationHook'
import { LoadingButton } from '@mui/lab'
import { updateSpeakers } from '../../../actions/conferenceHallUtils/updateSpeakers'

export type SpeakersFromConferenceHallUpdaterDialogProps = {
    event: Event
    speakers: Speaker[]
    isOpen: boolean
    onClose: () => void
}
export const SpeakersFromConferenceHallUpdaterDialog = ({
    speakers,
    event,
    isOpen,
    onClose,
}: SpeakersFromConferenceHallUpdaterDialogProps) => {
    const { createNotification } = useNotification()
    const [progress, setProgress] = useState({
        current: 0,
        total: speakers.length,
    })
    const [updating, setUpdating] = useState(false)

    if (!event.conferenceHallId) {
        return null
    }

    const update = async () => {
        setUpdating(true)

        await updateSpeakers(event.id, speakers, createNotification, setProgress)

        setUpdating(false)
        createNotification('Speakers updated successfully', { type: 'success' })
        onClose()
    }

    return (
        <Dialog open={isOpen} onClose={() => onClose()} maxWidth="lg" fullWidth={true} scroll="body">
            <DialogContent sx={{ minHeight: '80vh' }}>
                <RequireConferenceHallLogin>
                    {(_) => (
                        <>
                            <LoadingButton
                                onClick={() => update()}
                                variant="contained"
                                disabled={updating}
                                loading={updating}>
                                Run speaker update
                            </LoadingButton>

                            {updating && (
                                <Typography margin={1}>
                                    Progress: {progress.current} / {progress.total}
                                </Typography>
                            )}
                            <Typography margin={1}>
                                ⚠️ it will only update existing speakers from their up to date data on ConferenceHall,
                                but will also erase modifications made by you on ConferenceCenter (except specifics
                                fields like "notes")
                            </Typography>
                        </>
                    )}
                </RequireConferenceHallLogin>
            </DialogContent>
        </Dialog>
    )
}
