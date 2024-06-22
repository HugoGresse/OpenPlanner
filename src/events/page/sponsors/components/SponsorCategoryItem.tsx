import { Box, Button, IconButton, Typography } from '@mui/material'
import * as React from 'react'
import { useRef } from 'react'
import { SponsorCategory } from '../../../../types'
import { SponsorItem } from './SponsorItem'
import { collections } from '../../../../services/firebase'
import { doc } from 'firebase/firestore'
import {
    useFirestoreDocumentDeletion,
    useFirestoreDocumentMutation,
} from '../../../../services/hooks/firestoreMutationHooks'
import { DeleteRounded, Download, DragHandle } from '@mui/icons-material'
import { Draggable, DraggingStyle, NotDraggingStyle } from '@hello-pangea/dnd'
import { downloadImages } from '../../../../utils/images/downloadImages'

export type SponsorCategoryProps = {
    category: SponsorCategory
    index: number
    eventId: string
}

export const SponsorCategoryItem = ({ category, eventId, index }: SponsorCategoryProps) => {
    const mutation = useFirestoreDocumentMutation(doc(collections.sponsors(eventId), category.id))
    const deleteCategory = useFirestoreDocumentDeletion(doc(collections.sponsors(eventId), category.id))
    const ref = useRef(null)

    const getItemStyle = (isDragging: boolean, draggableStyle: DraggingStyle | NotDraggingStyle | undefined): any => ({
        userSelect: 'none',
        filter: isDragging ? 'contrast(50%)' : 'none',
        ...draggableStyle,
    })

    return (
        <Draggable key={category.id} draggableId={category.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}>
                    <Box marginY={1} ref={ref}>
                        <Typography variant="h3" sx={{ borderBottom: '1px solid #BBB', marginBottom: 1 }}>
                            <Box {...provided.dragHandleProps} sx={{ display: 'inline' }}>
                                <DragHandle />
                            </Box>
                            {category.name}
                            <IconButton
                                aria-label="Delete sponsor category"
                                onClick={() => {
                                    if (confirm('Are you sure you want to delete?')) {
                                        deleteCategory.mutate()
                                        return
                                    }
                                }}
                                edge="end">
                                <DeleteRounded />
                            </IconButton>
                            <IconButton
                                aria-label="Download"
                                onClick={() => {
                                    downloadImages(
                                        `${category.name}`,
                                        category.sponsors.map((s) => ({
                                            name: s.name,
                                            url: s.logoUrl,
                                        }))
                                    )
                                }}
                                edge="end">
                                <Download />
                            </IconButton>
                        </Typography>

                        <Box component="ul" margin={0} padding={0} display="flex" flexWrap="wrap">
                            {category.sponsors.map((sponsor) => (
                                <SponsorItem
                                    key={sponsor.id}
                                    sponsor={sponsor}
                                    categoryId={category.id}
                                    onDelete={async () => {
                                        await mutation.mutate({
                                            sponsors: category.sponsors.filter((s) => s.id !== sponsor.id),
                                        } as unknown as SponsorCategory)
                                    }}
                                />
                            ))}
                        </Box>

                        <Button
                            href={`/sponsors/new?categoryId=${category.id}`}
                            variant="contained"
                            sx={{ marginY: 1 }}>
                            Add sponsor to {category.name}
                        </Button>
                    </Box>
                </div>
            )}
        </Draggable>
    )
}
