import * as React from 'react'
import { useEffect, useState } from 'react'
import { ConferenceHallProposal, ConferenceHallProposalState } from '../../types'
import { useConferenceHallProposals } from '../hooks/useConferenceHallProposals'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'
import { Typography } from '@mui/material'

export type ConferenceHallProposalsPickerProps = {
    eventId: string
}
export const ConferenceHallProposalsPicker = ({ eventId }: ConferenceHallProposalsPickerProps) => {
    const proposals = useConferenceHallProposals(eventId)

    const [stats, setState] = useState({
        submitted: 0,
        accepted: 0,
        rejected: 0,
        backup: 0,
    })
    const proposalsData: ConferenceHallProposal[] = (proposals.data as ConferenceHallProposal[]) || []

    useEffect(() => {
        const submitted = proposalsData.filter((proposal) => proposal.state === ConferenceHallProposalState.submitted)
        const rejected = proposalsData.filter((proposal) => proposal.state === ConferenceHallProposalState.rejected)
        const accepted = proposalsData.filter((proposal) => proposal.state === ConferenceHallProposalState.accepted)
        const backup = proposalsData.filter((proposal) => proposal.state === ConferenceHallProposalState.backup)

        setState({
            submitted: submitted.length,
            accepted: accepted.length,
            rejected: rejected.length,
            backup: backup.length,
        })
    }, [proposalsData])

    return (
        <>
            <FirestoreQueryLoaderAndErrorDisplay hookResult={proposals} />

            {proposalsData.length && (
                <>
                    <Typography>Total proposals: {proposalsData.length}</Typography>
                    <Typography>Submitted: {stats.submitted}</Typography>
                    <Typography>Accepted: {stats.accepted}</Typography>
                    <Typography>Rejected: {stats.rejected}</Typography>
                    <Typography>Backup: {stats.backup}</Typography>
                </>
            )}
        </>
    )
}
