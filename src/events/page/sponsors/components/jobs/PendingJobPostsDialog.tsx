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
import { useMemo } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { DateTime } from 'luxon'
import { JobStatus } from '../../../../../constants/jobStatus'

export type PendingJobPostsDialogProps = {
    open: boolean
    onClose: () => void
    jobPosts: JobPost[]
    event: Event
    sponsorCategories: SponsorCategory[]
}

/**
 * This dialog is used to review the job posts that are pending approval.
 * It is used to approve or reject the job posts.
 * It is used to move to the next job post.
 * It is used to close the dialog.
 *
 * The dialog doesn't store the current index of the job post, it is always the first one. After approve or reject, the props are updated in realtime.
 *
 * @param param0
 * @returns
 */
export const PendingJobPostsDialog = ({
    open,
    onClose,
    jobPosts,
    event,
    sponsorCategories,
}: PendingJobPostsDialogProps) => {
    const currentJobPost = jobPosts[0]

    const jobPostMutation = useFirestoreDocumentMutationWithId(collections.jobPosts(event.id))
    const sponsorName = useMemo(() => {
        const sponsor = sponsorCategories.reduce((found, category) => {
            if (found) return found
            const matchingSponsor = category.sponsors.find((s) => s.id === currentJobPost?.sponsorId)
            return matchingSponsor || null
        }, null as { name: string } | null)
        return sponsor?.name
    }, [sponsorCategories, currentJobPost])

    const handleApprove = () => {
        if (!currentJobPost) return

        jobPostMutation.mutate(
            {
                status: JobStatus.APPROVED,
                updatedAt: Timestamp.now(),
            },
            currentJobPost.id
        )

        moveToNext()
    }

    const handleReject = () => {
        if (!currentJobPost) return

        jobPostMutation.mutate(
            {
                status: JobStatus.REJECTED,
                updatedAt: Timestamp.now(),
            },
            currentJobPost.id
        )

        moveToNext()
    }

    const moveToNext = () => {
        if (jobPosts.length <= 1) {
            onClose()
        }
    }

    if (!currentJobPost) {
        return null
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Review job post ({1}/{jobPosts.length})
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
