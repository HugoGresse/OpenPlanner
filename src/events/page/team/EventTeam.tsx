import { Event, TeamDragItem } from '../../../types'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { Box, Button, Card, Container, Typography } from '@mui/material'
import { useTeamByTeams } from '../../../services/hooks/useTeam'
import { useEffect } from 'react'
import { TeamGroup } from './components/TeamGroup'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TeamActions } from './components/TeamActions'
import { TeamDndContext } from './components/TeamDndContext'
import { useTeamDragAndDrop } from './hooks/useTeamDragAndDrop'

export type EventTeamProps = {
    event: Event
}

export const EventTeam = ({ event }: EventTeamProps) => {
    const teams = useTeamByTeams([event.id])
    const {
        activeItem,
        teamOrder,
        localTeamData,
        setTeamOrder,
        setLocalTeamData,
        collisionDetectionStrategy,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
    } = useTeamDragAndDrop(event.id)

    const teamData = teams.data || {}
    const totalMembers = Object.values(localTeamData).reduce((acc, members) => acc + members.length, 0)

    useEffect(() => {
        setLocalTeamData(teamData)
        setTeamOrder(Object.keys(teamData))
    }, [teamData, setLocalTeamData, setTeamOrder])

    if (teams.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={teams} />
    }

    // Get all member IDs for the sortable context
    const allMemberIds = Object.values(localTeamData)
        .flat()
        .map((member) => member.id)

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
                <Typography>{totalMembers} members</Typography>
                <TeamActions eventId={event.id} eventName={event.name} teamData={localTeamData} />
            </Box>
            <Card sx={{ padding: 2, minHeight: '50vh' }}>
                <TeamDndContext
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    collisionDetection={collisionDetectionStrategy}>
                    <SortableContext items={[...teamOrder, ...allMemberIds]} strategy={verticalListSortingStrategy}>
                        {teamOrder.map((teamName) => (
                            <TeamGroup
                                key={teamName + localTeamData[teamName].length}
                                teamName={teamName}
                                members={localTeamData[teamName] || []}
                                event={event}
                                isTeamBeingDragged={
                                    activeItem?.type === 'team' && (activeItem as TeamDragItem).teamName === teamName
                                }
                            />
                        ))}
                    </SortableContext>
                </TeamDndContext>
            </Card>
            <Box marginY={2}>
                <Button href={`/team/new`}>Add member</Button>
            </Box>
        </Container>
    )
}
