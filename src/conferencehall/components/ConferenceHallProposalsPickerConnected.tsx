import { ConferenceHallProposalsPicker } from './ConferenceHallProposalsPicker'
import { useConferenceHallProposals } from '../hooks/useConferenceHallProposals'
import React, { useState } from 'react'
import { ConferenceHallEvent, ConferenceHallProposal, Format } from '../../types'
import { ConferenceHallFormatsMapping } from './ConferenceHallFormatsMapping'
import { Grid } from '@mui/material'

export type ConferenceHallProposalsPickerConnectedProps = {
    event: ConferenceHallEvent
    onSubmit: ({ proposals, formats }: { proposals: ConferenceHallProposal[]; formats: Format[] }) => void
}

export const ConferenceHallProposalsPickerConnected = ({
    event,
    onSubmit,
}: ConferenceHallProposalsPickerConnectedProps) => {
    const eventId = event.id
    const proposals = useConferenceHallProposals(eventId)
    const [formats, setFormatDurations] = useState<Format[]>(
        event.formats.map((f) => ({
            ...f,
            durationMinutes: 20,
        }))
    )

    const submitSelectedProposalsAndFormats = (proposals: ConferenceHallProposal[]) => {
        onSubmit({
            proposals,
            formats: formats,
        })
    }

    return (
        <Grid container>
            <Grid item xs={12} sm={6}>
                <ConferenceHallProposalsPicker onSubmit={submitSelectedProposalsAndFormats} proposals={proposals} />
            </Grid>
            <Grid item xs={12} sm={6}>
                <ConferenceHallFormatsMapping formats={formats} setFormatDurations={setFormatDurations} />
            </Grid>
        </Grid>
    )
}
