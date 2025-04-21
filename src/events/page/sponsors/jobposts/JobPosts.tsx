import { useState, useMemo } from 'react'
import {
    Container,
    Typography,
    Box,
    Card,
    CardContent,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Grid,
    Chip,
    Link,
    Button,
    SelectChangeEvent,
} from '@mui/material'
import { Event } from '../../../../types'
import { JobStatus, JOB_STATUS_VALUES } from '../../../../constants/jobStatus'
import { useSponsors } from '../../../../services/hooks/useSponsors'
import { useJobsPosts } from '../../../../services/hooks/useJobsPosts'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { useSearchParams } from 'wouter'
import { TitlePortal } from '../../layouts/EventLayout'

const ALL_SPONSORS_ID = '-all-'

export const JobPosts = ({ event }: { event: Event }) => {
    const sponsors = useSponsors(event.id)
    const jobPosts = useJobsPosts(event.id)
    const [searchParams, setSearchParams] = useSearchParams()
    const sponsorIdParam = searchParams.get('sponsorId')

    const [selectedSponsorId, setSelectedSponsorId] = useState<string>(sponsorIdParam || '')
    const [selectedStatus, setSelectedStatus] = useState<string>('all')

    const sponsorsFlatMap = useMemo(() => {
        return (sponsors.data ?? []).flatMap((sponsor) => sponsor.sponsors) || []
    }, [sponsors])

    const filteredJobPosts = useMemo(() => {
        return (
            (jobPosts.data ?? []).filter((jobPost) => {
                if (selectedSponsorId === ALL_SPONSORS_ID) {
                    return selectedStatus === 'all' || jobPost.status === selectedStatus
                }
                return (
                    jobPost.sponsorId === selectedSponsorId &&
                    (selectedStatus === 'all' || jobPost.status === selectedStatus)
                )
            }) || []
        )
    }, [jobPosts, selectedSponsorId])

    const handleSponsorChange = (event: SelectChangeEvent) => {
        setSelectedSponsorId(event.target.value)
        setSearchParams({
            sponsorId: event.target.value,
        })
    }

    const handleStatusChange = (event: SelectChangeEvent) => {
        setSelectedStatus(event.target.value)
    }

    // Get sponsor name by ID
    const getSponsorName = (sponsorId: string): string => {
        const sponsor = sponsorsFlatMap.find((s) => s.id === sponsorId)
        return sponsor?.name || 'Unknown Sponsor'
    }

    // Get status chip color
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

    if (jobPosts.isLoading || sponsors.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={jobPosts} />
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                <TitlePortal>Job Posts</TitlePortal>
            </Typography>

            <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel id="sponsor-select-label">Sponsor</InputLabel>
                    <Select
                        labelId="sponsor-select-label"
                        value={selectedSponsorId}
                        label="Sponsor"
                        onChange={handleSponsorChange}>
                        <MenuItem value={ALL_SPONSORS_ID}>All Sponsors</MenuItem>
                        {sponsorsFlatMap.map((sponsor) => (
                            <MenuItem key={sponsor.id} value={sponsor.id}>
                                {sponsor.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel id="status-select-label">Status</InputLabel>
                    <Select
                        labelId="status-select-label"
                        value={selectedStatus}
                        label="Status"
                        onChange={handleStatusChange}>
                        <MenuItem value="all">All Statuses</MenuItem>
                        {JOB_STATUS_VALUES.map((status) => (
                            <MenuItem key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {filteredJobPosts.length === 0 ? (
                <Typography variant="body1" color="text.secondary" sx={{ mt: 4 }}>
                    No job posts found. Try changing the filters.
                </Typography>
            ) : (
                <Grid container spacing={3}>
                    {filteredJobPosts.map((jobPost) => (
                        <Grid item xs={12} md={6} key={jobPost.id}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            mb: 2,
                                        }}>
                                        <Typography variant="h6" component="h2">
                                            {jobPost.title}
                                        </Typography>
                                        <Chip
                                            label={jobPost.status.charAt(0).toUpperCase() + jobPost.status.slice(1)}
                                            color={getStatusColor(jobPost.status as JobStatus)}
                                            size="small"
                                        />
                                    </Box>

                                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                                        {getSponsorName(jobPost.sponsorId)} • {jobPost.location}
                                    </Typography>

                                    {jobPost.salary && (
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Salary: {jobPost.salary}
                                        </Typography>
                                    )}

                                    <Typography variant="body2" sx={{ mb: 2 }}>
                                        {jobPost.description.length > 150
                                            ? `${jobPost.description.substring(0, 150)}...`
                                            : jobPost.description}
                                    </Typography>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto' }}>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            component={Link}
                                            href={jobPost.externalLink}
                                            target="_blank"
                                            rel="noopener noreferrer">
                                            Apply
                                        </Button>

                                        <Typography variant="caption" color="text.secondary">
                                            {jobPost.category}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Container>
    )
}
