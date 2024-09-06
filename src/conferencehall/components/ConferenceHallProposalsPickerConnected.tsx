import React from 'react'
import { ConferenceHallProposal, Format } from '../../types'
import { Typography } from '@mui/material'

type ConferenceHallProposalsPickerConnectedProps = {
    conferenceHallEventId: string
    chFormats: {
        id: string
        name: string
    }[]
    onSubmit: ({ proposals, formats }: { proposals: ConferenceHallProposal[]; formats: Format[] }) => void
    submitText?: string
}

/**
 *
 * @param eventId: conference hall event id
 * @param onSubmit
 * @constructor
 */
export const ConferenceHallProposalsPickerConnected = ({
    conferenceHallEventId,
    chFormats,
    onSubmit,
    submitText,
}: ConferenceHallProposalsPickerConnectedProps) => {
    return (
        <>
            <Typography fontWeight="600" mt={2}>
                Conference Hall integration is disabled (major revamp needed for Conference Hall v2). You can track the
                status here https://github.com/HugoGresse/OpenPlanner/issues/133
            </Typography>
        </>
    )
}
