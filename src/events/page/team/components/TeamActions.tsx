import { Button, Menu, MenuItem, Stack } from '@mui/material'
import { ExpandMore, ImportExport as ImportIcon } from '@mui/icons-material'
import { useState } from 'react'
import { TeamImportDialog } from './TeamImportDialog'
import { downloadImages } from '../../../../utils/images/downloadImages'
import { TeamMember } from '../../../../types'

export enum TeamExportType {
    images = 'images',
}

type TeamActionsProps = {
    eventId: string
    eventName: string
    teamData: { [key: string]: TeamMember[] }
}

export const TeamActions = ({ eventId, eventName, teamData }: TeamActionsProps) => {
    const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null)
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

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
            `${eventName}-team`,
            membersWithPhotos.map((t) => ({
                name: t.name,
                url: t.photoUrl,
            }))
        )
    }

    return (
        <>
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
            <TeamImportDialog
                open={isImportDialogOpen}
                onClose={() => setIsImportDialogOpen(false)}
                currentEventId={eventId}
            />
        </>
    )
}
