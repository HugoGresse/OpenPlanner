import * as React from 'react'
import { useEffect, useState } from 'react'
import { ConferenceHallProposal, ConferenceHallProposalState } from '../../types'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'
import { Box, Typography } from '@mui/material'
import { CheckboxButtonGroup, FormContainer, useForm } from 'react-hook-form-mui'
import LoadingButton from '@mui/lab/LoadingButton'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup/dist/yup'
import { UseQueryResult } from 'react-query'
import { DocumentData } from '@firebase/firestore'

export type ConferenceHallProposalsPickerProps = {
    proposals: UseQueryResult<DocumentData>
    onSubmit: (proposals: ConferenceHallProposal[]) => void
}

const schema = yup
    .object({
        states: yup.array(yup.string()).required(),
    })
    .required()

export const ConferenceHallProposalsPicker = ({ proposals, onSubmit }: ConferenceHallProposalsPickerProps) => {
    const formContext = useForm({
        defaultValues: {
            states: [],
        },
    })
    const [stats, setState] = useState({
        submitted: 0,
        accepted: 0,
        rejected: 0,
        backup: 0,
        confirmed: 0,
    })
    const proposalsData: ConferenceHallProposal[] = (proposals.data as ConferenceHallProposal[]) || []

    useEffect(() => {
        const submitted = proposalsData.filter((proposal) => proposal.state === ConferenceHallProposalState.submitted)
        const rejected = proposalsData.filter((proposal) => proposal.state === ConferenceHallProposalState.rejected)
        const accepted = proposalsData.filter((proposal) => proposal.state === ConferenceHallProposalState.accepted)
        const backup = proposalsData.filter((proposal) => proposal.state === ConferenceHallProposalState.backup)
        const confirmed = proposalsData.filter((proposal) => proposal.state === ConferenceHallProposalState.confirmed)

        setState({
            submitted: submitted.length,
            accepted: accepted.length,
            rejected: rejected.length,
            backup: backup.length,
            confirmed: confirmed.length,
        })
    }, [proposals.data])

    const { watch, formState } = formContext

    const selectedProposalCount = watch('states').reduce((acc, state) => {
        return acc + stats[state]
    }, 0)

    return (
        <>
            <FirestoreQueryLoaderAndErrorDisplay hookResult={proposals} />

            {proposalsData.length && (
                <>
                    <Typography>Total proposals: {proposalsData.length}</Typography>

                    <FormContainer
                        formContext={formContext}
                        resolver={yupResolver(schema)}
                        onSuccess={async (data) => {
                            const selectedStates: string[] = data.states
                            const selectedProposals = proposalsData.filter((proposal) =>
                                selectedStates.includes(proposal.state)
                            )
                            return onSubmit(selectedProposals)
                        }}>
                        <Box display="flex" flexDirection="column">
                            <CheckboxButtonGroup
                                label="Select proposals states to be imported"
                                name="states"
                                options={[
                                    {
                                        id: 'submitted',
                                        label: `Submitted (${stats.submitted} proposals)`,
                                    },
                                    {
                                        id: 'accepted',
                                        label: `Accepted (${stats.accepted} proposals)`,
                                    },
                                    {
                                        id: 'confirmed',
                                        label: `Confirmed (${stats.confirmed} proposals)`,
                                    },
                                    {
                                        id: 'rejected',
                                        label: `Rejected (${stats.rejected} proposals)`,
                                    },
                                    {
                                        id: 'backup',
                                        label: `Backup (${stats.backup} proposals)`,
                                    },
                                ]}
                            />
                        </Box>

                        <LoadingButton
                            type="submit"
                            title="Import proposals & create ConferenceCenter event"
                            disabled={formState.isSubmitting}
                            loading={formState.isSubmitting}
                            variant="contained"
                            sx={{ marginTop: 2 }}>
                            {selectedProposalCount > 0
                                ? `Import ${selectedProposalCount} proposals & create Conference Center event`
                                : 'Create event without proposals'}
                        </LoadingButton>
                    </FormContainer>
                </>
            )}
        </>
    )
}
