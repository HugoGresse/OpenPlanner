import { Box, Button, Card, Typography } from '@mui/material'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { BuildingBlock, Event } from '../../../types'
import { collections } from '../../../services/firebase'
import { useFirestoreCollectionMutation } from '../../../services/hooks/firestoreMutationHooks'
import { BlockCard } from './BlockCard'
import { segmentBlocksByGroup } from './blockUtils'

type BlockSegmentProps = {
    event: Event
    group: string | null
    blocks: BuildingBlock[]
}
const BlockSegment = ({ event, group, blocks }: BlockSegmentProps) => {
    const mutation = useFirestoreCollectionMutation(collections.buildingBlocks(event.id))
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Reorder is metadata, saved instantly (same philosophy as the FAQ toggles)
    const handleDragEnd = (dragEvent: DragEndEvent) => {
        const { active, over } = dragEvent
        if (over && active.id !== over.id) {
            const oldIndex = blocks.findIndex((block) => block.id === active.id)
            const newIndex = blocks.findIndex((block) => block.id === over.id)
            if (oldIndex !== -1 && newIndex !== -1) {
                const reordered = arrayMove(blocks, oldIndex, newIndex)
                Promise.all(reordered.map((block, index) => mutation.mutate({ order: index }, block.id)))
            }
        }
    }

    return (
        <Box mt={group ? 2 : 0}>
            {group && (
                <Typography variant="subtitle1" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                    {group}/
                </Typography>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
                    {blocks.map((block) => (
                        <BlockCard key={block.id} event={event} block={block} />
                    ))}
                </SortableContext>
            </DndContext>
        </Box>
    )
}

export type BlockPageCardProps = {
    event: Event
    page: string
    blocks: BuildingBlock[]
    onAddBlock: (page: string) => void
}
export const BlockPageCard = ({ event, page, blocks, onAddBlock }: BlockPageCardProps) => {
    const segments = segmentBlocksByGroup(blocks)

    return (
        <Card sx={{ padding: 2, marginY: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
                <Typography variant="h4">{page}</Typography>
                <Button onClick={() => onAddBlock(page)}>Add block to {page}</Button>
            </Box>
            {segments.map((segment) => (
                <BlockSegment key={segment.group || ''} event={event} group={segment.group} blocks={segment.blocks} />
            ))}
        </Card>
    )
}
