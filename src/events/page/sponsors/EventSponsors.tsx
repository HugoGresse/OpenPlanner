import * as React from 'react'
import { useState } from 'react'
import { Box, Button, Card, Container, Typography } from '@mui/material'
import { Event, SponsorCategory } from '../../../types'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { useSponsors } from '../../../services/hooks/useSponsors'
import { SponsorCategoryItem } from './components/SponsorCategoryItem'
import { NewCategoryDialog } from './components/NewCategoryDialog'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import { updateSponsors } from '../../actions/updateSponsors'
import { JobPostSettings } from './components/jobs/JobPostSettings'
import { JobPostUrlDisplay } from './components/jobs/JobPostUrlDisplay'

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

    const onDragEnd = async (result: DropResult): Promise<any> => {
        // dropped outside the list
        if (!result.destination) {
            return
        }

        const sponsorsCategoriesWithOrder = sponsorsData.map((category: SponsorCategory, index: number) => {
            return {
                ...category,
                order: isNaN(category.order) ? index : category.order,
            }
        })
        // @ts-ignore
        const source = sponsorsCategoriesWithOrder[result.source.index]
        // @ts-ignore
        const destination = sponsorsCategoriesWithOrder[result.destination.index as any]

        if (!source || !destination) {
            return undefined
        }

        const updatedSponsorsCat = sponsorsCategoriesWithOrder.map((category: SponsorCategory) => {
            const order =
                category.id === source.id
                    ? destination.order
                    : category.id === destination.id
                    ? source.order
                    : category.order

            return {
                ...category,
                order: order,
            }
        })

        await updateSponsors(event.id, updatedSponsorsCat)

        return undefined
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
                <Typography> {sponsors.data?.length} sponsors</Typography>
                <JobPostSettings event={event} />
            </Box>

            {event.addJobPostEnabled && <JobPostUrlDisplay event={event} />}

            <Card sx={{ paddingX: 2, minHeight: '50vh', marginBottom: 2 }}>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="droppable">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef}>
                                {sponsorsData.map((category: SponsorCategory, index: number) => (
                                    <SponsorCategoryItem
                                        key={category.id}
                                        index={index}
                                        category={category}
                                        eventId={event.id}
                                    />
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                <Box marginY={2}>
                    <Button onClick={() => setNewCategoryDialog(true)}>Add category</Button>
                </Box>
            </Card>

            <NewCategoryDialog
                open={newCategoryDialog}
                eventId={event.id}
                onClose={() => {
                    setNewCategoryDialog(false)
                }}
            />
        </Container>
    )
}
