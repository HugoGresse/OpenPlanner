import { ConferenceHallProposalsPicker } from './ConferenceHallProposalsPicker'
import { useConferenceHallProposals } from '../hooks/useConferenceHallProposals'
import React from 'react'
import { ConferenceHallProposal } from '../../types'

export type ConferenceHallProposalsPickerConnectedProps = {
    eventId: string
    onSubmit: (proposals: ConferenceHallProposal[]) => void
}

export const ConferenceHallProposalsPickerConnected = ({
    eventId,
    onSubmit,
}: ConferenceHallProposalsPickerConnectedProps) => {
    const proposals = useConferenceHallProposals(eventId)

    return <ConferenceHallProposalsPicker onSubmit={onSubmit} proposals={proposals} />
}
