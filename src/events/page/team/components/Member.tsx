import * as React from 'react'
import { Avatar, Box, IconButton, Link, Typography } from '@mui/material'
import { DeleteRounded } from '@mui/icons-material'
import EditIcon from '@mui/icons-material/Edit'
import { Event, TeamMember } from '../../../../types'
import { useFirestoreDocumentDeletion } from '../../../../services/hooks/firestoreMutationHooks'
import { collections } from '../../../../services/firebase'
import { doc } from 'firebase/firestore'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export type MemberProps = {
    event: Event
    member: TeamMember
}

export const Member = ({ event, member }: MemberProps) => {
    const deletion = useFirestoreDocumentDeletion(doc(collections.team(event.id), member.id))
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: member.id,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <Box
            component="li"
            ref={setNodeRef}
            style={style}
            borderRadius={2}
            marginRight={1}
            marginBottom={1}
            paddingY={1}
            bgcolor="#88888888"
            display="flex"
            alignSelf="flex-start">
            <Box
                sx={{
                    paddingLeft: 1,
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'move',
                }}
                {...attributes}
                {...listeners}>
                <Avatar
                    src={member.photoUrl ? member.photoUrl : undefined}
                    alt={member.name}
                    sx={{
                        marginRight: 1,
                    }}
                />
                <Typography variant="h6">{member.name}</Typography>
            </Box>
            <Box display="flex" paddingX={2}>
                <IconButton
                    aria-label="Edit member"
                    component={Link}
                    href={`/team/${member.id}`}
                    edge="end"
                    onClick={(e) => e.stopPropagation()}>
                    <EditIcon />
                </IconButton>
                <IconButton
                    aria-label="Delete member"
                    onClick={async (e) => {
                        e.stopPropagation()
                        await deletion.mutate()
                    }}
                    edge="end">
                    <DeleteRounded />
                </IconButton>
            </Box>
        </Box>
    )
}
