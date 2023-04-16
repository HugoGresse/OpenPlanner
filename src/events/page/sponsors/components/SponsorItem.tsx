import * as React from 'react'
import { Sponsor } from '../../../../types'
import { Box, IconButton, Typography } from '@mui/material'
import { DeleteRounded } from '@mui/icons-material'
import EditIcon from '@mui/icons-material/Edit'

export type SponsorItemProps = {
    sponsor: Sponsor
}
export const SponsorItem = ({ sponsor }: SponsorItemProps) => {
    return (
        <Box>
            <Box>
                <Typography>{sponsor.name}</Typography>
                <img src={sponsor.logo} alt={sponsor.name} width={150} />
            </Box>
            <Box>
                <IconButton aria-label="Edit sponsor" onClick={() => {}} edge="end">
                    <EditIcon />
                </IconButton>
                <IconButton aria-label="Delete sponsor" onClick={() => {}} edge="end">
                    <DeleteRounded />
                </IconButton>
            </Box>
        </Box>
    )
}
