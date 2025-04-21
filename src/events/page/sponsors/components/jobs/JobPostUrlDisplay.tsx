import { useMemo, useState } from 'react'
import {
    Box,
    Button,
    Card,
    Typography,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material'
import { Event } from '../../../../../types'
import { collections } from '../../../../../services/firebase'
import { doc } from 'firebase/firestore'
import { useFirestoreDocumentMutation } from '../../../../../services/hooks/firestoreMutationHooks'
import { v4 as uuidv4 } from 'uuid'
import { TypographyCopyable } from '../../../../../components/TypographyCopyable'

export type JobPostUrlDisplayProps = {
    event: Event
}

export const JobPostUrlDisplay = ({ event }: JobPostUrlDisplayProps) => {
    const [confirmResetDialog, setConfirmResetDialog] = useState(false)

    const eventMutation = useFirestoreDocumentMutation(doc(collections.events, event.id))

    const jobPostUrl = useMemo(() => {
        return `${window.location.origin}/public/event/${event.id}/jobs/add?id=${event.addJobPostPrivateId}`
    }, [event.addJobPostPrivateId])

    const resetPrivateId = async () => {
        const newPrivateId = uuidv4()
        eventMutation.mutate({
            addJobPostPrivateId: newPrivateId,
        })
        setConfirmResetDialog(false)
    }

    return (
        <>
            <Card sx={{ padding: 2, marginBottom: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                    Job posts
                </Typography>
                <Typography variant="body2" sx={{ marginBottom: 1 }}>
                    Share this URL with sponsors to allow them to submit job postings:
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                    <TypographyCopyable>{jobPostUrl}</TypographyCopyable>
                    <Button variant="outlined" onClick={() => setConfirmResetDialog(true)} color="warning" size="small">
                        Reset link
                    </Button>
                </Box>
            </Card>

            <Dialog open={confirmResetDialog} onClose={() => setConfirmResetDialog(false)}>
                <DialogTitle>Reset job post link?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to reset the job post link? This will invalidate the prior link shared.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setConfirmResetDialog(false)}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={resetPrivateId} color="warning">
                        Reset link
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
