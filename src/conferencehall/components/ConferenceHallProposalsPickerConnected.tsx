import { ConferenceHallProposalsPicker } from './ConferenceHallProposalsPicker'
import React, { useState } from 'react'
import { ConferenceHallProposal, Format } from '../../types'
import { ConferenceHallFormatsMapping } from './ConferenceHallFormatsMapping'
import { useConferenceHallProposals } from '../hooks/useConferenceHallProposals'

type ConferenceHallProposalsPickerConnectedProps = {
    conferenceHallEventId: string
    chFormats: {
        id: string
        name: string
    }[]
    onSubmit: ({ proposals, formats }: { proposals: ConferenceHallProposal[]; formats: Format[] }) => void
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
}: ConferenceHallProposalsPickerConnectedProps) => {
    const proposals = useConferenceHallProposals(conferenceHallEventId)
    const [formats, setFormatDurations] = useState<Format[]>(
        (chFormats || []).map((f) => ({
            ...f,
            durationMinutes: 20,
        }))
    )

    const submitSelectedProposalsAndFormats = (proposals: ConferenceHallProposal[]) => {
        return onSubmit({
            proposals,
            formats: formats,
        })
    }

    return (
        <>
            <ConferenceHallFormatsMapping formats={formats} setFormatDurations={setFormatDurations} />
            <ConferenceHallProposalsPicker onSubmit={submitSelectedProposalsAndFormats} proposals={proposals} />
        </>
    )
}
