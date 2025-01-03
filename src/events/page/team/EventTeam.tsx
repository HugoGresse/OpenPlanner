import { Event, TeamMember } from '../../../types'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { Box, Button, Card, Container, Menu, MenuItem, Stack, Typography } from '@mui/material'
import { useTeam } from '../../../services/hooks/useTeam'
import { Member } from './components/Member'
import { useState } from 'react'
import { ExpandMore, ImportExport as ImportIcon } from '@mui/icons-material'
import { downloadImages } from '../../../utils/images/downloadImages'
import { TeamImportDialog } from './components/TeamImportDialog'

export type EventTeamProps = {
    event: Event
}
export enum TeamExportType {
    images = 'images',
}
export const EventTeam = ({ event }: EventTeamProps) => {
    const team = useTeam(event.id)
    const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null)
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

    const teamData = team.data || []

    const closeExportMenu = (type: TeamExportType | null) => () => {
        setExportAnchorEl(null)
        if (!type) {
            return
        }
        downloadImages(
            `${event.name}-team`,
            teamData.map((t: TeamMember) => ({
                name: t.name,
                url: t.photoUrl,
            }))
        )
    }

    if (team.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={team} />
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
                <Typography>{team.data?.length} members</Typography>
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
            <TeamImportDialog
                open={isImportDialogOpen}
                onClose={() => setIsImportDialogOpen(false)}
                currentEventId={event.id}
            />
        </Container>
    )
}
