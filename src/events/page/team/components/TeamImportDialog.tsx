import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    SelectChangeEvent,
} from '@mui/material'
import { useEvents } from '../../../../services/hooks/useEvents'
import { getTeam } from '../../../actions/getTeam'
import { TeamMember } from '../../../../types'
import { useSelector } from 'react-redux'
import { selectUserIdOpenPlanner } from '../../../../auth/authReducer'
import { Event } from '../../../../types'
import { LoadingButton } from '@mui/lab'
import { useFirestoreCollectionMutation } from '../../../../services/hooks/firestoreMutationHooks'
import { collections } from '../../../../services/firebase'
import { slugify } from '../../../../utils/slugify'

interface TeamImportDialogProps {
    open: boolean
    onClose: () => void
    currentEventId: string
}

export function TeamImportDialog({ open, onClose, currentEventId }: TeamImportDialogProps) {
    const userId = useSelector(selectUserIdOpenPlanner)
    const events = useEvents(userId)
    const [selectedEventId, setSelectedEventId] = useState<string>('')
    const [isImporting, setIsImporting] = useState(false)
    const mutation = useFirestoreCollectionMutation(collections.team(currentEventId))
    const [teamToImport, setTeamToImport] = useState<TeamMember[]>([])

    useEffect(() => {
        if (selectedEventId) {
            getTeam(selectedEventId).then(setTeamToImport)
        }
    }, [selectedEventId])

    const handleEventChange = async (event: SelectChangeEvent<string>) => {
        const eventId = event.target.value
        setSelectedEventId(eventId)
    }

    const handleImport = async () => {
        setIsImporting(true)
        try {
            for (const member of teamToImport) {
                await mutation.mutate(member, member.id)
            }

            onClose()
        } catch (error) {
            console.error('Error importing team:', error)
        } finally {
            setIsImporting(false)
        }
    }

    const availableEvents = events.data?.filter((event: Event) => event.id !== currentEventId) || []

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Import Team from Another Event</DialogTitle>
            <DialogContent>
                <Box sx={{ my: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel id="event-select-label">Event</InputLabel>
                        <Select
                            labelId="event-select-label"
                            value={selectedEventId}
                            label="Event"
                            onChange={handleEventChange}>
                            {availableEvents.map((event: Event) => (
                                <MenuItem key={event.id} value={event.id}>
                                    {event.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    Cancel
                </Button>
                <LoadingButton
                    onClick={handleImport}
                    disabled={!selectedEventId || isImporting}
                    loading={isImporting}
                    variant="contained">
                    {isImporting ? 'Importing...' : `Import ${teamToImport.length} members`}
                </LoadingButton>
            </DialogActions>
        </Dialog>
    )
}
