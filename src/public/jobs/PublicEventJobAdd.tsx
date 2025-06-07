import { Alert, Card, Container, Typography } from '@mui/material'
import { Sponsor, SponsorCategory } from '../../types'
import { usePublicEvent } from '../hooks/usePublicEvent'
import { useJobPostSubmission, JobPostFormData } from '../hooks/useJobPostSubmission'
import { JobPostForm } from './JobPostForm'
import { JobHeader } from './JobHeader'

type SponsorOption = {
    id: string
    name: string
    category: string
}

export type PublicEventJobAddProps = {
    eventId: string
}

export const PublicEventJobAdd = ({ eventId }: PublicEventJobAddProps) => {
    const privateId = new URLSearchParams(window.location.search).get('id')
    const { data, isLoading, error } = usePublicEvent(eventId)
    const {
        isSubmitting,
        submitSuccess,
        error: submitError,
        clearError,
        submitJobPost,
    } = useJobPostSubmission(eventId, privateId)

    // Flatten sponsors from categories to a simple array of sponsors
    const flattenedSponsors =
        (data?.sponsors ?? []).flatMap(
            (category: SponsorCategory) =>
                category.sponsors?.map((sponsor: Sponsor) => ({
                    id: sponsor.id,
                    name: sponsor.name,
                    category: category.name || 'Unknown',
                })) || []
        ) || []

    // Sort sponsors by name
    flattenedSponsors.sort((a: SponsorOption, b: SponsorOption) => a.name.localeCompare(b.name))

    const handleSubmitJobPost = async (data: JobPostFormData) => {
        await submitJobPost(data, {
            resetForm: () => {
                // Reset handled by the shared form component
            },
            customErrorHandler: (error, response) => {
                // Custom error handling for specific job post scenarios
                if (response?.status === 409) {
                    return 'A job post with this title already exists for this sponsor.'
                }
                if (response?.status === 413) {
                    return 'The job description is too long. Please shorten it and try again.'
                }

                // Try to parse structured error responses
                try {
                    const errorJson = JSON.parse(error.message)
                    if (errorJson.error === 'FST_ERR_VALIDATION') {
                        return `Validation Error: ${errorJson.reason || 'Please check your input.'}`
                    }
                    if (errorJson.error && typeof errorJson.error === 'string') {
                        return errorJson.error
                    }
                } catch {
                    // Fall back to generic message if parsing fails
                }

                return 'Failed to submit job post. Please try again.'
            },
        })
    }

    if (!privateId) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Alert severity="error">Invalid URL. Please use the link provided by the event organizer.</Alert>
            </Container>
        )
    }

    if (isLoading) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Typography>Loading sponsors...</Typography>
            </Container>
        )
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Alert severity="error">Error loading sponsors: {error}</Alert>
            </Container>
        )
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <JobHeader event={data?.event} />
            <Card sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Add Job Posting
                </Typography>

                <JobPostForm
                    isSubmitting={isSubmitting}
                    errorMsg={submitError}
                    showSponsorSelect={true}
                    sponsorOptions={flattenedSponsors.map((sponsor: SponsorOption) => ({
                        id: sponsor.id,
                        label: `${sponsor.name} (${sponsor.category})`,
                    }))}
                    onSubmit={handleSubmitJobPost}
                    submitButtonText="Add Job Post"
                />

                {submitSuccess && (
                    <Alert severity="success" sx={{ mt: 3 }}>
                        Job post submitted successfully and the {data?.event.name} team will review it before
                        publication.
                    </Alert>
                )}

                {submitError && (
                    <Alert severity="error" onClose={clearError} sx={{ mt: 3 }}>
                        {submitError}
                    </Alert>
                )}
            </Card>
        </Container>
    )
}
