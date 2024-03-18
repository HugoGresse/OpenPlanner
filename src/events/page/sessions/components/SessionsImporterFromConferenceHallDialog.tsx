import * as React from 'react'
import { ConferenceHallProposalsPickerConnected } from '../../../../conferencehall/components/ConferenceHallProposalsPickerConnected'
import { RequireConferenceHallLogin } from '../../../../conferencehall/RequireConferenceHallLogin'

import { ConferenceHallProposal, Event, Format } from '../../../../types'
import { Dialog, DialogContent, Typography } from '@mui/material'
import { useNotification } from '../../../../hooks/notificationHook'
import { addSessionsFromCH } from '../../../actions/sessions/addSessionsFromCH'
import { UPDATE_FIELDS_SESSIONS } from '../../../actions/conferenceHallUtils/importSessions'

export type SessionsImporterFromConferenceHallProps = {
    event: Event
    isOpen: boolean
    onClose: () => void
}
export const SessionsImporterFromConferenceHallDialog = ({
    event,
    isOpen,
    onClose,
}: SessionsImporterFromConferenceHallProps) => {
    const { createNotification } = useNotification()

    if (!event.conferenceHallId) {
        return null
    }

    const addProposals = async ({ proposals }: { proposals: ConferenceHallProposal[]; formats: Format[] }) => {
        await addSessionsFromCH(event, proposals, createNotification)
        onClose()
    }

    return (
        <Dialog open={isOpen} onClose={() => onClose()} maxWidth="lg" fullWidth={true} scroll="body">
            <DialogContent sx={{ minHeight: '80vh' }}>
                <RequireConferenceHallLogin>
                    {(_) => (
                        <>
                            <ConferenceHallProposalsPickerConnected
                                conferenceHallEventId={event.conferenceHallId || ''}
                                chFormats={[]}
                                onSubmit={addProposals}
                                submitText="Add sessions"
                            />
                            <Typography margin={1}>
                                ⚠️ it will update or add already added sessions matching the selected one. The update
                                will only concern those fields: {UPDATE_FIELDS_SESSIONS.join(', ')}
                            </Typography>
                        </>
                    )}
                </RequireConferenceHallLogin>
            </DialogContent>
        </Dialog>
    )
}
