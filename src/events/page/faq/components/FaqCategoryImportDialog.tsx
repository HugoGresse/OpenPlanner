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
    Paper,
} from '@mui/material'
import { useEvents } from '../../../../services/hooks/useEvents'
import { getFaq } from '../../../actions/getFaq'
import { FaqCategory, Faq } from '../../../../types'
import { useSelector } from 'react-redux'
import { selectUserIdOpenPlanner } from '../../../../auth/authReducer'
import { Event } from '../../../../types'
import { LoadingButton } from '@mui/lab'
import { useFirestoreCollectionMutation } from '../../../../services/hooks/firestoreMutationHooks'
import { collections } from '../../../../services/firebase'
import { collection } from '@firebase/firestore'
import { LinearProgress, Stack, Tooltip } from '@mui/material'

interface FaqCategoryImportDialogProps {
    open: boolean
    onClose: () => void
    currentEventId: string
}

interface CategoryItemProps {
    category: FaqCategory
    currentEventId: string
    onImportComplete: () => void
}

// Individual category component with its own import functionality
const CategoryItem = ({ category, currentEventId, onImportComplete }: CategoryItemProps) => {
    const [isImporting, setIsImporting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [statusText, setStatusText] = useState('')
    const categoryMutation = useFirestoreCollectionMutation(collections.faq(currentEventId))
    const itemsMutation = useFirestoreCollectionMutation(
        collection(collections.faq(currentEventId), category.id, 'items')
    )

    const handleImport = async () => {
        setIsImporting(true)
        setProgress(0)
        setStatusText('Importing category...')

        try {
            // Step 1: Import the category itself (without the faqs array)
            const newCategory: FaqCategory = {
                ...category,
                faqs: [],
            }
            await categoryMutation.mutate(newCategory, newCategory.id)
            setProgress(20)

            // Step 2: Import all FAQ items to the destination event
            const faqItems = category.faqs
            setStatusText(`Importing ${faqItems.length} FAQ items...`)

            if (faqItems.length > 0) {
                // Import items one by one with progress updates
                for (let i = 0; i < faqItems.length; i++) {
                    const item = faqItems[i]
                    await itemsMutation.mutate(item, item.id)

                    // Update progress based on how many items we've processed
                    const itemProgress = Math.floor((80 * (i + 1)) / faqItems.length)
                    setProgress(20 + itemProgress)
                }
            } else {
                setProgress(100)
            }

            setStatusText('Import complete!')
            onImportComplete()
        } catch (error) {
            console.error(`Error importing FAQ category ${category.name}:`, error)
            setStatusText('Error occurred during import')
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={isImporting ? 1 : 0}>
                <Box>
                    <Typography variant="subtitle1">{category.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Questions: {category.faqs.length}
                    </Typography>
                </Box>
                <LoadingButton
                    size="small"
                    variant="contained"
                    onClick={handleImport}
                    loading={isImporting}
                    disabled={isImporting}>
                    {isImporting ? 'Importing...' : 'Import Category & Items'}
                </LoadingButton>
            </Box>

            {isImporting && (
                <Stack spacing={1} sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        {statusText}
                    </Typography>
                    <Tooltip title={`${progress}% complete`}>
                        <LinearProgress variant="determinate" value={progress} />
                    </Tooltip>
                </Stack>
            )}
        </Paper>
    )
}

export function FaqCategoryImportDialog({ open, onClose, currentEventId }: FaqCategoryImportDialogProps) {
    const userId = useSelector(selectUserIdOpenPlanner)
    const events = useEvents(userId)
    const [selectedEventId, setSelectedEventId] = useState<string>('')
    const [categoriesToImport, setCategoriesToImport] = useState<FaqCategory[]>([])
    const [importedCategoryIds, setImportedCategoryIds] = useState<string[]>([])

    useEffect(() => {
        if (selectedEventId) {
            getFaq(selectedEventId).then((categories) => {
                setCategoriesToImport(categories)
                setImportedCategoryIds([])
            })
        }
    }, [selectedEventId])

    const handleEventChange = async (event: SelectChangeEvent<string>) => {
        const eventId = event.target.value
        setSelectedEventId(eventId)
    }

    const handleCategoryImported = (categoryId: string) => {
        setImportedCategoryIds((prev) => [...prev, categoryId])
    }

    const availableEvents = events.data?.filter((event: Event) => event.id !== currentEventId) || []

    // Filter out already imported categories
    const availableCategories = categoriesToImport.filter((category) => !importedCategoryIds.includes(category.id))

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Import FAQ Categories from Another Event</DialogTitle>
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

                {selectedEventId && availableCategories.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Available Categories
                        </Typography>
                        <Box sx={{ maxHeight: 400, overflow: 'auto', mt: 1 }}>
                            {availableCategories.map((category) => (
                                <CategoryItem
                                    key={category.id}
                                    category={category}
                                    currentEventId={currentEventId}
                                    onImportComplete={() => handleCategoryImported(category.id)}
                                />
                            ))}
                        </Box>
                    </Box>
                )}

                {selectedEventId && categoriesToImport.length > 0 && availableCategories.length === 0 && (
                    <Typography sx={{ mt: 2 }} color="text.secondary">
                        All categories have been imported.
                    </Typography>
                )}

                {selectedEventId && categoriesToImport.length === 0 && (
                    <Typography sx={{ mt: 2 }} color="text.secondary">
                        No FAQ categories found in the selected event.
                    </Typography>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    )
}
