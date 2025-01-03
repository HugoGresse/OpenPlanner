import { Box, TextField, Typography } from '@mui/material'
import { Event, TeamMember } from '../../../../types'
import { Member } from './Member'
import { useState } from 'react'
import { useFirestoreDocumentMutationWithId } from '../../../../services/hooks/firestoreMutationHooks'
import { collections } from '../../../../services/firebase'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    SortableContext,
    arrayMove,
    horizontalListSortingStrategy,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'

export type TeamGroupProps = {
    event: Event
    teamName: string
    members: TeamMember[]
}

export const TeamGroup = ({ event, teamName, members }: TeamGroupProps) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editedName, setEditedName] = useState(teamName)
    const [orderedMembers, setOrderedMembers] = useState<TeamMember[]>(members)
    const mutation = useFirestoreDocumentMutationWithId(collections.team(event.id))

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: teamName,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleMemberDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        setOrderedMembers((items) => {
            const oldIndex = items.findIndex((m) => m.id === active.id)
            const newIndex = items.findIndex((m) => m.id === over.id)
            return arrayMove(items, oldIndex, newIndex)
        })
    }

    const handleTeamNamePress = () => {
        if (!isEditing) {
            setIsEditing(true)
        }
    }

    const handleChangeTeamName = async (e: React.FormEvent) => {
        e.preventDefault()
        if (editedName !== teamName) {
            // Update all team members with the new team name
            for (const member of members) {
                const editedMember: TeamMember = {
                    ...member,
                    team: editedName,
                }
                await mutation.mutate(editedMember, member.name)
            }
        }
        setIsEditing(false)
    }

    const handleKeyDownOnTeamName = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleChangeTeamName(e)
        } else if (e.key === 'Escape') {
            setEditedName(teamName)
            setIsEditing(false)
        }
    }

    return (
        <Box sx={{ mb: 4 }} ref={setNodeRef} style={style}>
            <Box component="form" onSubmit={handleChangeTeamName}>
                {isEditing ? (
                    <TextField
                        variant="standard"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={handleKeyDownOnTeamName}
                        onBlur={handleChangeTeamName}
                        autoFocus
                        sx={{ mb: 2 }}
                        inputProps={{ style: { fontSize: '1.5rem', fontWeight: 400 } }}
                    />
                ) : (
                    <Typography
                        variant="h5"
                        sx={{ mb: 2, cursor: 'move' }}
                        onClick={handleTeamNamePress}
                        {...attributes}
                        {...listeners}>
                        {teamName}
                    </Typography>
                )}
            </Box>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMemberDragEnd}>
                <SortableContext items={orderedMembers.map((m) => m.id)} strategy={horizontalListSortingStrategy}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 2,
                        }}>
                        {orderedMembers.map((member) => (
                            <Member key={member.id} member={member} event={event} />
                        ))}
                    </Box>
                </SortableContext>
            </DndContext>
        </Box>
    )
}
