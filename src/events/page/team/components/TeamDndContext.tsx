import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { ReactNode } from 'react'

type TeamDndContextProps = {
    children: ReactNode
    onDragStart: (event: any) => void
    onDragOver: (event: any) => void
    onDragEnd: (event: any) => void
    collisionDetection: any
}

export const TeamDndContext = ({
    children,
    onDragStart,
    onDragOver,
    onDragEnd,
    collisionDetection,
}: TeamDndContextProps) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}>
            {children}
        </DndContext>
    )
}
