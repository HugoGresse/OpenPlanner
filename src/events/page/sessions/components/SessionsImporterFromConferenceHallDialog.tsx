import * as React from 'react'
import { ConferenceHallProposalsPickerConnected } from '../../../../conferencehall/components/ConferenceHallProposalsPickerConnected'
import { RequireConferenceHallLogin } from '../../../../conferencehall/RequireConferenceHallLogin'

import { Event } from '../../../../types'
import { Dialog, DialogContent } from '@mui/material'

export type SessionsImporterFromConferenceHallProps = {
    event: Event
    isOpen: boolean
    onClose: (eventId: string | null) => void
}
export const SessionsImporterFromConferenceHallDialog = ({
    event,
    isOpen,
    onClose,
}: SessionsImporterFromConferenceHallProps) => {
    if (!event.conferenceHallId) {
        return null
    }

    return (
        <Dialog open={isOpen} onClose={() => onClose(null)} maxWidth="lg" fullWidth={true} scroll="body">
            <DialogContent sx={{ minHeight: '80vh' }}>
                <RequireConferenceHallLogin>
                    {(chUserId) => (
                        <ConferenceHallProposalsPickerConnected
                            conferenceHallEventId={event.conferenceHallId || ''}
                            chFormats={[]}
                            onSubmit={console.log}
                        />
                    )}
                </RequireConferenceHallLogin>
            </DialogContent>
        </Dialog>
    )
}
