import { Box, TextField, Typography } from '@mui/material'
import { Event, TeamMember } from '../../../../types'
import { Member } from './Member'
import { useState } from 'react'
import { useFirestoreDocumentMutationWithId } from '../../../../services/hooks/firestoreMutationHooks'
import { collections } from '../../../../services/firebase'

export type TeamGroupProps = {
    event: Event
    teamName: string
    members: TeamMember[]
}

export const TeamGroup = ({ event, teamName, members }: TeamGroupProps) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editedName, setEditedName] = useState(teamName)
    const mutation = useFirestoreDocumentMutationWithId(collections.team(event.id))

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
        <Box sx={{ mb: 4 }}>
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
                    <Typography variant="h5" sx={{ mb: 2 }} onClick={handleTeamNamePress} style={{ cursor: 'pointer' }}>
                        {teamName}
                    </Typography>
                )}
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 2,
                }}>
                {members.map((member) => (
                    <Member key={member.id} member={member} event={event} />
                ))}
            </Box>
        </Box>
    )
}
