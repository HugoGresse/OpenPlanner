import { Event, TeamMember } from '../../../types'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { Box, Button, Card, Container, Menu, MenuItem, Stack, Typography } from '@mui/material'
import { useTeamByTeams } from '../../../services/hooks/useTeam'
import { useState, useEffect } from 'react'
import { ExpandMore, ImportExport as ImportIcon } from '@mui/icons-material'
import { downloadImages } from '../../../utils/images/downloadImages'
import { TeamImportDialog } from './components/TeamImportDialog'
import { TeamGroup } from './components/TeamGroup'
import {
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useFirestoreDocumentMutationWithId } from '../../../services/hooks/firestoreMutationHooks'
import { collections } from '../../../services/firebase'

export type EventTeamProps = {
    event: Event
}
export enum TeamExportType {
    images = 'images',
}
export const EventTeam = ({ event }: EventTeamProps) => {
    const teams = useTeamByTeams([event.id])
    const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null)
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
    const [teamOrder, setTeamOrder] = useState<string[]>([])
    const memberMutation = useFirestoreDocumentMutationWithId(collections.team(event.id))

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const teamData = teams.data || {}
    const totalMembers = Object.values(teamData).reduce((acc, members) => acc + members.length, 0)

    useEffect(() => {
        setTeamOrder(Object.keys(teamData))
    }, [teamData])

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        setTeamOrder((items) => {
            const oldIndex = items.indexOf(active.id.toString())
            const newIndex = items.indexOf(over.id.toString())
            const newOrder = arrayMove(items, oldIndex, newIndex)

            // Update all teams with their new order
            newOrder.forEach((teamName, index) => {
                const members = teamData[teamName] || []
                members.forEach((member) => {
                    const editedMember: TeamMember = {
                        ...member,
                        teamOrder: index,
                    }
                    console.log(member.name, index)

                    memberMutation.mutate(editedMember, member.name)
                })
            })

            return newOrder
        })
    }

    const closeExportMenu = (type: TeamExportType | null) => () => {
        setExportAnchorEl(null)
        if (!type) {
            return
        }
        const allMembers = Object.values(teamData).flat()
        const membersWithPhotos = allMembers.filter(
            (member): member is TeamMember & { photoUrl: string } => !!member.photoUrl
        )
        downloadImages(
            `${event.name}-team`,
            membersWithPhotos.map((t) => ({
                name: t.name,
                url: t.photoUrl,
            }))
        )
    }

    if (teams.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={teams} />
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
                <Typography>{totalMembers} members</Typography>
                <Stack direction="row" spacing={1}>
                    <Button onClick={(event) => setExportAnchorEl(event.currentTarget)} endIcon={<ExpandMore />}>
                        Export
                    </Button>
                    <Button onClick={() => setIsImportDialogOpen(true)} startIcon={<ImportIcon />}>
                        Import Team
                    </Button>
                </Stack>
                <Menu
                    id="basic-menu"
                    anchorEl={exportAnchorEl}
                    open={!!exportAnchorEl}
                    onClose={closeExportMenu(null)}
                    MenuListProps={{
                        'aria-labelledby': 'basic-button',
                    }}>
                    <MenuItem onClick={closeExportMenu(TeamExportType.images)}>Download images</MenuItem>
                </Menu>
            </Box>
            <Card sx={{ padding: 2, minHeight: '50vh' }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={teamOrder} strategy={verticalListSortingStrategy}>
                        {teamOrder.map((teamName) => (
                            <TeamGroup
                                key={teamName + teamData[teamName].length}
                                teamName={teamName}
                                members={teamData[teamName] || []}
                                event={event}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </Card>
            <Box marginY={2}>
                <Button href={`/team/new`}>Add member</Button>
            </Box>
            <TeamImportDialog
                open={isImportDialogOpen}
                onClose={() => setIsImportDialogOpen(false)}
                currentEventId={event.id}
            />
        </Container>
    )
}
