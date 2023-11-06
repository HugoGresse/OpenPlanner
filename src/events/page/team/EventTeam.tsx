import { Event, TeamMember } from '../../../types'
import * as React from 'react'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { Box, Button, Card, Container, Typography } from '@mui/material'
import { useTeam } from '../../../services/hooks/useTeam'
import { Member } from './components/Member'

export type EventTeamProps = {
    event: Event
}
export const EventTeam = ({ event }: EventTeamProps) => {
    const team = useTeam(event.id)

    const teamData = team.data || []

    if (team.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={team} />
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
                <Typography>{team.data?.length} members</Typography>
                <Box marginY={2}>
                    <Button href={`/team/new`}>Add member</Button>
                </Box>
            </Box>
            <Card
                sx={{
                    padding: 2,
                    minHeight: '50vh',
                    display: 'flex',
                    flexDirection: 'column',
                    flexFlow: 'row',
                    flexWrap: 'wrap',
                    alignContent: 'flex-start',
                }}>
                {teamData.map((member: TeamMember) => (
                    <Member key={member.id} member={member} event={event} />
                ))}
            </Card>
            <Box marginY={2}>
                <Button href={`/team/new`}>Add member</Button>
            </Box>
        </Container>
    )
}
