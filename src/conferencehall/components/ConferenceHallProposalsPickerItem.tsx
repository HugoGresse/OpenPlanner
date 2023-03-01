import * as React from 'react'
import { ConferenceHallProposal } from '../../types'
import { Box, Button } from '@mui/material'

export type ConferenceHallProposalsPickerItemProps = {
    proposal: ConferenceHallProposal
    onPick: (proposal: ConferenceHallProposal) => void
}
export const ConferenceHallProposalsPickerItem = ({ proposal, onPick }: ConferenceHallProposalsPickerItemProps) => {
    return (
        <Box component="li" marginRight={1} marginBottom={1} sx={{ listStyle: 'none' }}>
            <Button variant="contained" size="large" onClick={() => onPick(proposal)}>
                {proposal.title}
            </Button>
        </Box>
    )
}
