import * as React from 'react'
import { Sponsor } from '../../../../types'
import { Box, IconButton, Link, Typography } from '@mui/material'
import { DeleteRounded } from '@mui/icons-material'
import EditIcon from '@mui/icons-material/Edit'

export type SponsorItemProps = {
    sponsor: Sponsor
    categoryId: string
    onDelete: () => void
}
export const SponsorItem = ({ sponsor, onDelete, categoryId }: SponsorItemProps) => {
    return (
        <Box component="li" borderRadius={2} marginRight={1} bgcolor="#DDD" display="flex">
            <Box
                sx={{
                    img: {
                        borderRadius: 2,
                        height: 100,
                        width: 100,
                        objectFit: 'contain',
                        overflow: 'hidden',
                    },
                }}>
                <Typography variant="h6">{sponsor.name}</Typography>
                <img src={sponsor.logoUrl} alt={sponsor.name} />
            </Box>
            <Box display="flex" flexDirection="column" paddingX={2}>
                <IconButton
                    aria-label="Edit sponsor"
                    component={Link}
                    href={`/sponsors/${sponsor.id}?categoryId=${categoryId}`}
                    edge="end">
                    <EditIcon />
                </IconButton>
                <IconButton aria-label="Delete sponsor" onClick={onDelete} edge="end">
                    <DeleteRounded />
                </IconButton>
            </Box>
        </Box>
    )
}
