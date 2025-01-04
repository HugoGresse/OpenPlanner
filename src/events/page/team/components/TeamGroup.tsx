import { Box, TextField, Typography } from '@mui/material'
import { Event, TeamMember } from '../../../../types'
import { Member } from './Member'
import { useState, useEffect } from 'react'
import { useFirestoreDocumentMutationWithId } from '../../../../services/hooks/firestoreMutationHooks'
import { collections } from '../../../../services/firebase'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { DragHandle } from '@mui/icons-material'

export type TeamGroupProps = {
    event: Event
    teamName: string
    members: TeamMember[]
    isTeamBeingDragged?: boolean
}

export const TeamGroup = ({ event, teamName, members, isTeamBeingDragged }: TeamGroupProps) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editedName, setEditedName] = useState(teamName)
    const [orderedMembers, setOrderedMembers] = useState<TeamMember[]>([])
    const mutation = useFirestoreDocumentMutationWithId(collections.team(event.id))

    useEffect(() => {
        setOrderedMembers(members.sort((a, b) => a.order - b.order))
    }, [members])

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: teamName,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
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
                await mutation.mutate(editedMember, member.id)
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Box
                            {...attributes}
                            {...listeners}
                            sx={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                            <DragHandle />
                        </Box>
                        <Typography variant="h5" onClick={handleTeamNamePress}>
                            {teamName}
                        </Typography>
                    </Box>
                )}
            </Box>
            <SortableContext items={orderedMembers.map((m) => m.id)} strategy={rectSortingStrategy}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 2,
                        minHeight: '100px',
                        padding: 2,
                        bgcolor: isDragging || isTeamBeingDragged ? 'action.hover' : 'transparent',
                        borderRadius: 1,
                        border: '2px dashed transparent',
                        borderColor: isDragging ? 'primary.main' : 'transparent',
                        transition: 'all 0.2s ease',
                    }}>
                    {orderedMembers.map((member) => (
                        <Member key={member.id} member={member} event={event} />
                    ))}
                </Box>
            </SortableContext>
        </Box>
    )
}
