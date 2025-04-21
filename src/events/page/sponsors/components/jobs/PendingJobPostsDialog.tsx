import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Divider,
    Link,
    Chip,
    Stack,
} from '@mui/material'
import { Event, JobPost, SponsorCategory } from '../../../../../types'
import { useFirestoreDocumentMutationWithId } from '../../../../../services/hooks/firestoreMutationHooks'
import { Timestamp } from 'firebase/firestore'
import { collections } from '../../../../../services/firebase'
import { useMemo, useState } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { DateTime } from 'luxon'
export type PendingJobPostsDialogProps = {
    open: boolean
    onClose: () => void
    jobPosts: JobPost[]
    event: Event
    sponsorCategories: SponsorCategory[]
}

export const PendingJobPostsDialog = ({
    open,
    onClose,
    jobPosts,
    event,
    sponsorCategories,
}: PendingJobPostsDialogProps) => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const pendingJobPosts = jobPosts.filter((jobPost) => !jobPost.approved)
    const currentJobPost = pendingJobPosts[currentIndex]

    // Only create a mutation when there's a valid job post
    const jobPostMutation = useFirestoreDocumentMutationWithId(collections.jobPosts(event.id))

    const sponsorName = useMemo(() => {
        const sponsor = sponsorCategories.find((sponsor) =>
            sponsor.sponsors.find((s) => s.id === currentJobPost?.sponsorId)
        )
        return sponsor?.name
    }, [sponsorCategories, currentJobPost])

    const handleApprove = () => {
        if (!currentJobPost) return

        jobPostMutation.mutate(
            {
                approved: true,
                updatedAt: Timestamp.now(),
            },
            currentJobPost.id
        )

        moveToNext()
    }

    const handleReject = () => {
        // TODO: Implement reject
        // In a real application, you might want to either delete the job post
        // or add a 'rejected' status instead of just moving to the next one
        moveToNext()
    }

    const moveToNext = () => {
        if (currentIndex < pendingJobPosts.length - 1) {
            setCurrentIndex(currentIndex + 1)
        } else {
            onClose()
        }
    }

    if (!currentJobPost) {
        return null
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Review job post ({currentIndex + 1}/{pendingJobPosts.length})
            </DialogTitle>
            <DialogContent>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h5" gutterBottom>
                    Sponsor: {sponsorName}
                </Typography>
                <Typography variant="h6" gutterBottom>
                    {currentJobPost.title}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    {currentJobPost.category && <Chip label={`Category: ${currentJobPost.category}`} size="small" />}
                    {currentJobPost.location && <Chip label={`Location: ${currentJobPost.location}`} size="small" />}
                    {currentJobPost.salary && <Chip label={`Salary: ${currentJobPost.salary}`} size="small" />}
                </Stack>

                <Typography variant="subtitle1" gutterBottom>
                    Description
                </Typography>
                <MDEditor.Markdown source={currentJobPost.description} />

                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        External Link
                    </Typography>
                    <Link href={currentJobPost.externalLink} target="_blank" rel="noopener" component="a">
                        {currentJobPost.externalLink}
                    </Link>
                </Box>

                {currentJobPost.contactEmail && (
                    <Box>
                        <Typography variant="subtitle1" gutterBottom>
                            Contact email
                        </Typography>
                        <Typography variant="body2">{currentJobPost.contactEmail}</Typography>
                    </Box>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                    Created at{' '}
                    {DateTime.fromJSDate(currentJobPost.createdAt.toDate()).toLocaleString(DateTime.DATETIME_FULL)}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleReject} color="error">
                    Reject
                </Button>
                <Button onClick={handleApprove} color="primary" variant="contained">
                    Approve
                </Button>
            </DialogActions>
        </Dialog>
    )
}
