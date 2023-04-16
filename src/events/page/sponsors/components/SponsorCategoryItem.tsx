import { Box, Button, Typography } from '@mui/material'
import * as React from 'react'
import { SponsorCategory } from '../../../../types'
import { SponsorItem } from './SponsorItem'

export type SponsorCategoryProps = {
    category: SponsorCategory
}
export const SponsorCategoryItem = ({ category }: SponsorCategoryProps) => {
    return (
        <Box marginY={1}>
            <Typography variant="h3" sx={{ borderBottom: '1px solid #BBB' }}>
                {category.name}
            </Typography>

            {category.sponsors.map((sponsor) => (
                <SponsorItem key={sponsor.id} sponsor={sponsor} />
            ))}

            <Button href={`/sponsors/new?category=${category.id}`} variant="contained" sx={{ marginY: 1 }}>
                Add sponsor to {category.name}
            </Button>
        </Box>
    )
}
