import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material'
import { useState } from 'react'
import { Event, Session } from '../../../../../types'

interface BatchEditDialogProps {
    isOpen: boolean
    onClose: () => void
    selectedSessions: string[]
    displayedSessions: Session[]
    event: Event
    onUpdateSessions: (sessionsToUpdate: Array<Partial<Session> & { id: string }>) => Promise<void>
}

export const BatchEditDialog = ({
    isOpen,
    onClose,
    selectedSessions,
    displayedSessions,
    event,
    onUpdateSessions,
}: BatchEditDialogProps) => {
    const [batchEditField, setBatchEditField] = useState<string>('category')
    const [batchEditValue, setBatchEditValue] = useState<string>('')
    const [isBatchUpdating, setIsBatchUpdating] = useState(false)

    const handleBatchEditSubmit = async () => {
        if (!batchEditField || !batchEditValue) return

        setIsBatchUpdating(true)
        try {
            const sessionsToUpdate = displayedSessions
                .filter((session) => selectedSessions.includes(session.id))
                .map((session) => {
                    // Convert string boolean values to actual booleans for boolean fields
                    if (batchEditField === 'showInFeedback' || batchEditField === 'hideTrackTitle') {
                        return {
                            id: session.id,
                            [batchEditField]: batchEditValue === 'true',
                        }
                    }
                    // Convert string number values to actual numbers for number fields
                    if (batchEditField === 'extendHeight' || batchEditField === 'extendWidth') {
                        return {
                            id: session.id,
                            [batchEditField]: parseInt(batchEditValue, 10),
                        }
                    }
                    // Regular string value fields
                    return {
                        id: session.id,
                        [batchEditField]: batchEditValue,
                    }
                })

            await onUpdateSessions(sessionsToUpdate)
            onClose()
        } catch (error) {
            console.error('Error updating sessions:', error)
        } finally {
            setIsBatchUpdating(false)
        }
    }

    return (
        <Dialog open={isOpen} onClose={onClose} fullWidth>
            <DialogTitle>Batch Edit {selectedSessions.length} Sessions</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" gutterBottom>
                            Field to Edit
                        </Typography>
                        <Select fullWidth value={batchEditField} onChange={(e) => setBatchEditField(e.target.value)}>
                            <MenuItem value="category">Category</MenuItem>
                            <MenuItem value="format">Format</MenuItem>
                            <MenuItem value="language">Language</MenuItem>
                            <MenuItem value="showInFeedback">Show In Feedback</MenuItem>
                            <MenuItem value="hideTrackTitle">Hide Track Title</MenuItem>
                            <MenuItem value="extendHeight">Extend Height</MenuItem>
                            <MenuItem value="extendWidth">Extend Width</MenuItem>
                        </Select>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" gutterBottom>
                            New Value
                        </Typography>
                        {batchEditField === 'category' ? (
                            <Select
                                fullWidth
                                value={batchEditValue}
                                onChange={(e) => setBatchEditValue(e.target.value)}>
                                {(event.categories || []).map((category) => (
                                    <MenuItem key={category.id} value={category.id}>
                                        {category.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        ) : batchEditField === 'format' ? (
                            <Select
                                fullWidth
                                value={batchEditValue}
                                onChange={(e) => setBatchEditValue(e.target.value)}>
                                {(event.formats || []).map((format) => (
                                    <MenuItem key={format.id} value={format.id}>
                                        {format.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        ) : batchEditField === 'showInFeedback' || batchEditField === 'hideTrackTitle' ? (
                            <Select
                                fullWidth
                                value={batchEditValue}
                                onChange={(e) => setBatchEditValue(e.target.value)}>
                                <MenuItem value="true">Yes</MenuItem>
                                <MenuItem value="false">No</MenuItem>
                            </Select>
                        ) : batchEditField === 'language' ? (
                            <Select
                                fullWidth
                                value={batchEditValue}
                                onChange={(e) => setBatchEditValue(e.target.value)}>
                                <MenuItem value="en">English</MenuItem>
                                <MenuItem value="fr">French</MenuItem>
                                <MenuItem value="de">German</MenuItem>
                                <MenuItem value="es">Spanish</MenuItem>
                                <MenuItem value="it">Italian</MenuItem>
                            </Select>
                        ) : (
                            <TextField
                                fullWidth
                                value={batchEditValue}
                                onChange={(e) => setBatchEditValue(e.target.value)}
                                type={
                                    batchEditField === 'extendHeight' || batchEditField === 'extendWidth'
                                        ? 'number'
                                        : 'text'
                                }
                            />
                        )}
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleBatchEditSubmit}
                    variant="contained"
                    disabled={!batchEditField || !batchEditValue || isBatchUpdating}>
                    {isBatchUpdating ? 'Updating...' : 'Update Sessions'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
