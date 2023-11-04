import { Box, Button, Typography } from '@mui/material'
import * as React from 'react'
import { SponsorCategory } from '../../../../types'
import { SponsorItem } from './SponsorItem'
import { collections } from '../../../../services/firebase'
import { doc } from 'firebase/firestore'
import { useFirestoreDocumentMutation } from '@react-query-firebase/firestore'

export type SponsorCategoryProps = {
    category: SponsorCategory
    eventId: string
}
export const SponsorCategoryItem = ({ category, eventId }: SponsorCategoryProps) => {
    const mutation = useFirestoreDocumentMutation(doc(collections.sponsors(eventId), category.id), {
        merge: true,
    })

    return (
        <Box marginY={1}>
            <Typography variant="h3" sx={{ borderBottom: '1px solid #BBB', marginBottom: 1 }}>
                {category.name}
            </Typography>

            <Box component="ul" margin={0} padding={0} display="flex">
                {category.sponsors.map((sponsor) => (
                    <SponsorItem
                        key={sponsor.id}
                        sponsor={sponsor}
                        categoryId={category.id}
                        onDelete={async () => {
                            await mutation.mutateAsync({
                                sponsors: category.sponsors.filter((s) => s.id !== sponsor.id),
                            } as unknown as SponsorCategory)
                        }}
                    />
                ))}
            </Box>

            <Button href={`/sponsors/new?categoryId=${category.id}`} variant="contained" sx={{ marginY: 1 }}>
                Add sponsor to {category.name}
            </Button>
        </Box>
    )
}
