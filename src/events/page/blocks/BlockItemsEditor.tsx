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
import { BuildingBlockItem, BuildingBlockItemType, BuildingBlockVariant, Event } from '../../../types'
import { BlockItemRow } from './BlockItemRow'

export type BlockItemsEditorProps = {
    event: Event
    type: BuildingBlockItemType
    variant: BuildingBlockVariant
    items: BuildingBlockItem[]
    onChange: (items: BuildingBlockItem[]) => void
}
export const BlockItemsEditor = ({ event, type, variant, items, onChange }: BlockItemsEditorProps) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (dragEvent: DragEndEvent) => {
        const { active, over } = dragEvent
        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex((item) => item.id === active.id)
            const newIndex = items.findIndex((item) => item.id === over.id)
            if (oldIndex !== -1 && newIndex !== -1) {
                onChange(arrayMove(items, oldIndex, newIndex).map((item, index) => ({ ...item, order: index })))
            }
        }
    }

    const mapKeyCounts = items.reduce<Record<string, number>>((acc, item) => {
        if (item.key) acc[item.key] = (acc[item.key] || 0) + 1
        return acc
    }, {})

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                {items.map((item, index) => (
                    <BlockItemRow
                        key={item.id}
                        event={event}
                        type={type}
                        variant={variant}
                        item={item}
                        duplicateKey={!!item.key && mapKeyCounts[item.key] > 1}
                        onDelete={() => {
                            const newItems = [...items]
                            newItems.splice(index, 1)
                            onChange(newItems.map((it, itemIndex) => ({ ...it, order: itemIndex })))
                        }}
                        onChange={(newItem) => {
                            const newItems = [...items]
                            newItems[index] = newItem
                            onChange(newItems)
                        }}
                    />
                ))}
            </SortableContext>
        </DndContext>
    )
}
