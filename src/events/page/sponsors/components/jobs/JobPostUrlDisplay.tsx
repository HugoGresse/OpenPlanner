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
import { Event, JobPost, SponsorCategory } from '../../../../../types'
import { collections } from '../../../../../services/firebase'
import { doc } from 'firebase/firestore'
import { useFirestoreDocumentMutation } from '../../../../../services/hooks/firestoreMutationHooks'
import { v4 as uuidv4 } from 'uuid'
import { TypographyCopyable } from '../../../../../components/TypographyCopyable'
import { PendingJobPostsDialog } from './PendingJobPostsDialog'
import { JobStatus } from '../../../../../constants/jobStatus'

export type JobPostUrlDisplayProps = {
    event: Event
    jobPosts: JobPost[]
    sponsorCategories: SponsorCategory[]
}

export const JobPostUrlDisplay = ({ event, jobPosts, sponsorCategories }: JobPostUrlDisplayProps) => {
    const [confirmResetDialog, setConfirmResetDialog] = useState(false)
    const [pendingJobPostsDialog, setPendingJobPostsDialog] = useState(false)

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

    const { pendingJobPosts, approvedJobPosts, rejectedJobPosts } = useMemo(() => {
        return {
            pendingJobPosts: jobPosts.filter((jobPost) => jobPost.status === JobStatus.PENDING),
            approvedJobPosts: jobPosts.filter((jobPost) => jobPost.status === JobStatus.APPROVED),
            rejectedJobPosts: jobPosts.filter((jobPost) => jobPost.status === JobStatus.REJECTED),
        }
    }, [jobPosts])

    return (
        <>
            <Card sx={{ padding: 2, marginBottom: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                    Job posts, {pendingJobPosts.length} pending, {approvedJobPosts.length} approved,{' '}
                    {rejectedJobPosts.length} rejected
                </Typography>
                {pendingJobPosts.length > 0 && (
                    <Button
                        variant="contained"
                        onClick={() => {
                            setPendingJobPostsDialog(true)
                        }}
                        sx={{ mb: 2 }}>
                        Review pending job posts
                    </Button>
                )}

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

            <PendingJobPostsDialog
                open={pendingJobPostsDialog}
                onClose={() => setPendingJobPostsDialog(false)}
                jobPosts={jobPosts}
                event={event}
                sponsorCategories={sponsorCategories}
            />
        </>
    )
}
