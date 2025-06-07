import { useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Card,
    Container,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
} from '@mui/material'
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material'
import { JobStatus } from '../../constants/jobStatus'
import { SponsorJobForm } from './SponsorJobForm'
import { JobPost } from '../../types'
import { useSponsorJobManagement } from '../hooks/useSponsorJobManagement'
import { JobHeader } from './JobHeader'
import { usePublicEvent } from '../hooks/usePublicEvent'

export type SponsorJobManagementProps = {
    eventId: string
}

export const PublicEventJobManagement = ({ eventId }: SponsorJobManagementProps) => {
    const publicEvent = usePublicEvent(eventId)
    const sponsorToken = new URLSearchParams(window.location.search).get('token')
    const {
        sponsor,
        jobPosts,
        isLoading,
        isSubmitting,
        error: errorMsg,
        clearError,
        loadJobPosts,
        deleteJobPost,
    } = useSponsorJobManagement(eventId, sponsorToken)

    const [editJobPost, setEditJobPost] = useState<JobPost | null>(null)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [jobPostToDelete, setJobPostToDelete] = useState<string | null>(null)

    const handleDeleteJobPost = async (jobPostId: string) => {
        try {
            await deleteJobPost(jobPostId)
            setDeleteDialogOpen(false)
            setJobPostToDelete(null)
        } catch (error) {
            // Error is already handled by the hook
        }
    }

    const handleFormSuccess = async () => {
        setIsFormOpen(false)
        setEditJobPost(null)
        await loadJobPosts()
    }

    const getStatusColor = (status: JobStatus) => {
        switch (status) {
            case JobStatus.APPROVED:
                return 'success'
            case JobStatus.PENDING:
                return 'warning'
            case JobStatus.REJECTED:
                return 'error'
            default:
                return 'default'
        }
    }

    if (!sponsorToken) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Alert severity="error">
                    Invalid access token. Please use the link provided by the event organizer.
                </Alert>
            </Container>
        )
    }

    if (isLoading) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Typography>Loading your job posts...</Typography>
            </Container>
        )
    }

    if (errorMsg && !sponsor) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Alert severity="error" onClose={clearError}>
                    {errorMsg}
                </Alert>
            </Container>
        )
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <JobHeader event={publicEvent?.data?.event} />
            <Card sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                        {sponsor?.logoUrl && (
                            <Box
                                component="img"
                                src={sponsor.logoUrl}
                                alt={`${sponsor.name} logo`}
                                sx={{ height: 60, width: 'auto', objectFit: 'contain' }}
                            />
                        )}
                        <Typography variant="h5">{sponsor?.name || 'Your'} job posts</Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                            setEditJobPost(null)
                            setIsFormOpen(true)
                        }}>
                        Add New Job Post
                    </Button>
                </Box>

                {errorMsg && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
                        {errorMsg}
                    </Alert>
                )}

                {jobPosts.length === 0 ? (
                    <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                        You haven't posted any jobs yet. Click "Add New Job Post" to get started.
                    </Typography>
                ) : (
                    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                        <Table sx={{ minWidth: { xs: 300, sm: 650 } }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Title</TableCell>
                                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Location</TableCell>
                                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Category</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {jobPosts.map((jobPost) => (
                                    <TableRow key={jobPost.id}>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {jobPost.title}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="textSecondary"
                                                    sx={{ display: { xs: 'block', sm: 'none' } }}>
                                                    {jobPost.location} • {jobPost.category}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                            {jobPost.location}
                                        </TableCell>
                                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                            {jobPost.category}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={jobPost.status}
                                                color={getStatusColor(jobPost.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        setEditJobPost(jobPost)
                                                        setIsFormOpen(true)
                                                    }}>
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => {
                                                        setJobPostToDelete(jobPost.id)
                                                        setDeleteDialogOpen(true)
                                                    }}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Card>

            {/* Add/Edit Job Post Dialog */}
            <Dialog open={isFormOpen} onClose={() => setIsFormOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>{editJobPost ? 'Edit Job Post' : 'Add New Job Post'}</DialogTitle>
                <DialogContent>
                    <SponsorJobForm
                        eventId={eventId}
                        sponsorToken={sponsorToken}
                        jobPost={editJobPost}
                        onSuccess={handleFormSuccess}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete Job Post</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this job post? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={() => jobPostToDelete && handleDeleteJobPost(jobPostToDelete)}
                        color="error"
                        variant="contained"
                        disabled={isSubmitting}>
                        {isSubmitting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    )
}
