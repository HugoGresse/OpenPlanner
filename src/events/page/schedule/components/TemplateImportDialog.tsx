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
    Typography,
} from '@mui/material'
import { useEvents } from '../../../../services/hooks/useEvents'
import { getTemplate } from '../../../actions/sessions/getTemplate'
import { Session } from '../../../../types'
import { useSelector } from 'react-redux'
import { selectUserIdOpenPlanner } from '../../../../auth/authReducer'
import { Event } from '../../../../types'
import { LoadingButton } from '@mui/lab'
import { useFirestoreCollectionMutation } from '../../../../services/hooks/firestoreMutationHooks'
import { collections } from '../../../../services/firebase'
import { generateFirestoreId } from '../../../../utils/generateFirestoreId'
import { DateTime } from 'luxon'

interface TemplateImportDialogProps {
    open: boolean
    onClose: () => void
    currentEventId: string
    currentEvent: Event
}

export function TemplateImportDialog({ open, onClose, currentEventId, currentEvent }: TemplateImportDialogProps) {
    const userId = useSelector(selectUserIdOpenPlanner)
    const events = useEvents(userId)
    const [selectedEventId, setSelectedEventId] = useState<string>('')
    const [isImporting, setIsImporting] = useState(false)
    const mutation = useFirestoreCollectionMutation(collections.sessionsTemplate(currentEventId))
    const [templatesToImport, setTemplatesToImport] = useState<Session[]>([])
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

    useEffect(() => {
        if (selectedEventId) {
            getTemplate(selectedEventId).then(setTemplatesToImport)
            const event = events.data?.find((e: Event) => e.id === selectedEventId)
            setSelectedEvent(event || null)
        }
    }, [selectedEventId, events.data])

    const handleEventChange = async (event: SelectChangeEvent<string>) => {
        const eventId = event.target.value
        setSelectedEventId(eventId)
    }

    const handleImport = async () => {
        if (!selectedEvent || !currentEvent.dates.start || !selectedEvent.dates.start) {
            return
        }

        setIsImporting(true)
        try {
            // Sort templates by date to ensure consistent ordering
            const sortedTemplates = [...templatesToImport].sort((a, b) => {
                if (!a.dates?.start || !b.dates?.start) return 0
                return a.dates.start.toMillis() - b.dates.start.toMillis()
            })

            // Create a map of track indices from source to target
            const trackIndexMap = new Map<string, string>()
            selectedEvent.tracks.forEach((sourceTrack, index) => {
                if (currentEvent.tracks[index]) {
                    trackIndexMap.set(sourceTrack.id, currentEvent.tracks[index].id)
                }
            })

            // Create maps for format and category IDs
            const formatMap = new Map<string, string>()
            const categoryMap = new Map<string, string>()

            // Map formats by name
            selectedEvent.formats.forEach((sourceFormat) => {
                const targetFormat = currentEvent.formats.find(
                    (f) => f.name.toLowerCase() === sourceFormat.name.toLowerCase()
                )
                if (targetFormat) {
                    formatMap.set(sourceFormat.id, targetFormat.id)
                }
            })

            // Map categories by name
            selectedEvent.categories.forEach((sourceCategory) => {
                const targetCategory = currentEvent.categories.find(
                    (c) => c.name.toLowerCase() === sourceCategory.name.toLowerCase()
                )
                if (targetCategory) {
                    categoryMap.set(sourceCategory.id, targetCategory.id)
                }
            })

            for (const template of sortedTemplates) {
                let newDates = null
                if (template.dates?.start && template.dates?.end) {
                    // Get the day index (0 for first day, 1 for second day, etc.)
                    const sourceStart = DateTime.fromJSDate(selectedEvent.dates.start)
                    const templateStart = template.dates.start
                    const dayIndex = Math.floor(templateStart.diff(sourceStart, 'days').days)

                    // Get the target event's start date
                    const targetStart = DateTime.fromJSDate(currentEvent.dates.start)

                    // Create new dates by adding the day index to the target start date
                    // while preserving the original time of day
                    const newStart: DateTime = targetStart.plus({ days: dayIndex }).set({
                        hour: templateStart.hour,
                        minute: templateStart.minute,
                        second: 0,
                        millisecond: 0,
                    })

                    const newEnd: DateTime = targetStart.plus({ days: dayIndex }).set({
                        hour: template.dates.end.hour,
                        minute: template.dates.end.minute,
                        second: 0,
                        millisecond: 0,
                    })

                    newDates = {
                        start: newStart.toJSDate(),
                        end: newEnd.toJSDate(),
                    }
                }

                // Map the track ID based on index
                const newTrackId = template.trackId ? trackIndexMap.get(template.trackId) || null : null

                // Map format and category IDs
                const newFormatId = template.format ? formatMap.get(template.format) || null : null
                const newCategoryId = template.category ? categoryMap.get(template.category) || null : null

                const newTemplate: Session = {
                    ...template,
                    id: generateFirestoreId(),
                    dates: newDates as unknown as { start: DateTime; end: DateTime },
                    speakers: [],
                    tags: [],
                    trackId: newTrackId,
                    format: newFormatId,
                    category: newCategoryId,
                }
                const result = await mutation.mutate(newTemplate, newTemplate.id)
            }

            onClose()
        } catch (error) {
            console.error('Error importing template:', error)
        } finally {
            setIsImporting(false)
        }
    }

    const availableEvents = events.data?.filter((event: Event) => event.id !== currentEventId) || []

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Import Template from Another Event</DialogTitle>
            <DialogContent>
                <Box sx={{ my: 2 }}>
                    <Typography gutterBottom>
                        This will import the templates from the selected event to the current event. It will respect
                        days based on their index, and format and category will be mapped based on lowercased names.
                    </Typography>
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
                    <Typography variant="body2" color="text.secondary">
                        {mutation.error ? 'Error importing templates: ' + mutation.error.message : ''}
                    </Typography>
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
                    {isImporting ? 'Importing...' : `Import ${templatesToImport.length} session templates`}
                </LoadingButton>
            </DialogActions>
        </Dialog>
    )
}
