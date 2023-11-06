import * as React from 'react'
import { Avatar, Box, IconButton, Link, Typography } from '@mui/material'
import { DeleteRounded } from '@mui/icons-material'
import EditIcon from '@mui/icons-material/Edit'
import { Event, TeamMember } from '../../../../types'
import { useFirestoreDocumentDeletion } from '../../../../services/hooks/firestoreMutationHooks'
import { collections } from '../../../../services/firebase'
import { doc } from 'firebase/firestore'

export type MemberProps = {
    event: Event
    member: TeamMember
}
export const Member = ({ event, member }: MemberProps) => {
    const deletion = useFirestoreDocumentDeletion(doc(collections.team(event.id), member.id))

    return (
        <Box
            component="li"
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
                }}>
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
                <IconButton aria-label="Edit member" component={Link} href={`/team/${member.id}`} edge="end">
                    <EditIcon />
                </IconButton>
                <IconButton
                    aria-label="Delete member"
                    onClick={async () => {
                        await deletion.mutate()
                    }}
                    edge="end">
                    <DeleteRounded />
                </IconButton>
            </Box>
        </Box>
    )
}
