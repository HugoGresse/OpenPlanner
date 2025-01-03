import { Event, TeamMember } from '../../../types'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { Box, Button, Card, Container, Menu, MenuItem, Stack, Typography } from '@mui/material'
import { useTeamByTeams } from '../../../services/hooks/useTeam'
import { useState } from 'react'
import { ExpandMore, ImportExport as ImportIcon } from '@mui/icons-material'
import { downloadImages } from '../../../utils/images/downloadImages'
import { TeamImportDialog } from './components/TeamImportDialog'
import { TeamGroup } from './components/TeamGroup'

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

    const teamData = teams.data || {}
    const totalMembers = Object.values(teamData).reduce((acc, members) => acc + members.length, 0)

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
                {Object.entries(teamData).map(([teamName, members]) => (
                    <TeamGroup key={teamName} teamName={teamName} members={members} event={event} />
                ))}
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
