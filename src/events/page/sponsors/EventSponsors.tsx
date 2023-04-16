import * as React from 'react'
import { useState } from 'react'
import { Box, Button, Card, Container, Typography } from '@mui/material'
import { Event, SponsorCategory } from '../../../types'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { useSponsors } from '../../../services/hooks/useSponsors'
import { SponsorCategoryItem } from './components/SponsorCategoryItem'
import { NewCategoryDialog } from './components/NewCategoryDialog'

export type EventSponsorsProps = {
    event: Event
}
export const EventSponsors = ({ event }: EventSponsorsProps) => {
    const sponsors = useSponsors(event.id)
    const [newCategoryDialog, setNewCategoryDialog] = useState(false)

    const sponsorsData = sponsors.data || []

    if (sponsors.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={sponsors} />
    }

    console.log(sponsorsData)

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
                <Typography>{sponsors.data?.length} sponsors</Typography>
            </Box>
            <Card sx={{ paddingX: 2, minHeight: '50vh' }}>
                {sponsorsData.map((category: SponsorCategory) => (
                    <SponsorCategoryItem key={category.id} category={category} />
                ))}

                <Box marginY={2}>
                    <Button onClick={() => setNewCategoryDialog(true)}>Add category</Button>
                </Box>
            </Card>
            <NewCategoryDialog
                open={newCategoryDialog}
                eventId={event.id}
                onClose={() => {
                    setNewCategoryDialog(false)
                    sponsors.refetch()
                }}
            />
        </Container>
    )
}
