import { useState } from 'react'
import { Alert, Box, Button, Card, Container, FormControl, FormHelperText, Grid, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { FormContainer, SelectElement, TextFieldElement, useForm } from 'react-hook-form-mui'
import { JOB_CATEGORIES } from './JOB_CATEGORIES'
import { BaseAPIUrl } from '../hooks/constants'
import { Sponsor, SponsorCategory } from '../../types'
import { usePublicEvent } from '../hooks/usePublicEvent'
import MDEditor from '@uiw/react-md-editor'
import { Controller } from 'react-hook-form'

type SponsorOption = {
    id: string
    name: string
    category: string
}

export type JobPostFormData = {
    sponsorId: string
    title: string
    description: string
    location: string
    externalLink: string
    category: string
    salary?: string
    requirements?: string[]
    contactEmail?: string
}

export type PublicEventJobAddProps = {
    eventId: string
}

export const PublicEventJobAdd = ({ eventId }: PublicEventJobAddProps) => {
    const privateId = new URLSearchParams(window.location.search).get('id')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const { data, isLoading, error } = usePublicEvent(eventId)

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

    const formContext = useForm<JobPostFormData>({
        defaultValues: {
            title: '',
            description: '',
            location: '',
            externalLink: '',
            category: '',
            salary: '',
            requirements: [],
            contactEmail: '',
        },
    })

    const { reset, formState, control } = formContext

    const submitJobPost = async (data: JobPostFormData, shouldReset: boolean = true) => {
        if (!privateId) {
            setErrorMsg('Missing private ID')
            return
        }

        setIsSubmitting(true)
        setErrorMsg('')

        try {
            const url = new URL(BaseAPIUrl as string)
            url.pathname += `v1/${eventId}/sponsors/jobPosts`

            const cleanedData = Object.fromEntries(
                Object.entries(data).filter(([_, value]) => value !== undefined && value !== '')
            )

            const response = await fetch(url.href, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...cleanedData,
                    addJobPostPrivateId: privateId,
                }),
            })

            if (!response.ok) {
                const errorResponse = await response.text()
                try {
                    const errorJson = JSON.parse(errorResponse)
                    if (errorJson.error === 'FST_ERR_VALIDATION') {
                        throw new Error(errorJson.reason || 'Failed to submit job post')
                    } else if (errorJson.error && errorJson.error.length > 0) {
                        throw new Error(errorJson.error)
                    } else {
                        throw new Error(errorResponse || 'Failed to submit job post')
                    }
                } catch (error) {
                    throw error
                }
            }

            setSubmitSuccess(true)

            if (shouldReset) {
                // Preserve location and sponsorId when resetting form
                const { sponsorId, location } = data
                reset({
                    sponsorId,
                    location,
                    title: '',
                    description: '',
                    externalLink: '',
                    category: '',
                    salary: '',
                    requirements: [],
                    contactEmail: '',
                })
            }
        } catch (error) {
            console.error('Error submitting job post:', error)
            setErrorMsg(error instanceof Error ? error.message : 'An error occurred')
        } finally {
            setIsSubmitting(false)
        }
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
            <Card sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Add Job Posting
                </Typography>

                <FormContainer
                    formContext={formContext}
                    onSuccess={async (data) => {
                        await submitJobPost(data)
                    }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <SelectElement
                                name="sponsorId"
                                label="Sponsor"
                                required
                                fullWidth
                                disabled={isSubmitting}
                                options={flattenedSponsors.map((sponsor: SponsorOption) => ({
                                    id: sponsor.id,
                                    label: `${sponsor.name} (${sponsor.category})`,
                                }))}
                            />
                            <FormHelperText>Select which sponsor this job belongs to</FormHelperText>
                        </Grid>

                        <Grid item xs={12}>
                            <TextFieldElement
                                name="title"
                                label="Job Title"
                                required
                                fullWidth
                                disabled={isSubmitting}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                    Job Description
                                </Typography>
                                <Box
                                    sx={{
                                        border: '1px solid rgba(0, 0, 0, 0.23)',
                                        borderRadius: 1,
                                        '&:hover': {
                                            borderColor: 'text.primary',
                                        },
                                        '&:focus-within': {
                                            borderColor: 'primary.main',
                                            borderWidth: 2,
                                        },
                                    }}>
                                    <Controller
                                        name="description"
                                        control={control}
                                        rules={{ required: true }}
                                        render={({ field }) => (
                                            <MDEditor
                                                value={field.value}
                                                minHeight={500}
                                                height="100%"
                                                onChange={(value) => field.onChange(value || '')}
                                                style={{ backgroundColor: 'transparent' }}
                                            />
                                        )}
                                    />
                                </Box>
                                {formState.errors.description && (
                                    <FormHelperText error>Description is required</FormHelperText>
                                )}
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <SelectElement
                                name="category"
                                label="Job Category"
                                required
                                fullWidth
                                disabled={isSubmitting}
                                options={JOB_CATEGORIES.map((category: string) => ({
                                    id: category,
                                    label: category,
                                }))}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextFieldElement
                                name="salary"
                                label="Salary Range (Optional)"
                                fullWidth
                                disabled={isSubmitting}
                                helperText={`E.g., ${new Intl.NumberFormat(navigator.language, {
                                    style: 'currency',
                                    currency: navigator.language.startsWith('fr') ? 'EUR' : 'USD',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                }).format(80000)} - ${new Intl.NumberFormat(navigator.language, {
                                    style: 'currency',
                                    currency: navigator.language.startsWith('fr') ? 'EUR' : 'USD',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                }).format(100000)}`}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextFieldElement
                                name="externalLink"
                                label="Application Link"
                                required
                                fullWidth
                                disabled={isSubmitting}
                                type="url"
                                helperText="URL where candidates can apply"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextFieldElement
                                name="location"
                                label="Location"
                                required
                                fullWidth
                                disabled={isSubmitting}
                                helperText="Example: Télétravail, Montpellier, Paris, Paris 50%"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextFieldElement
                                name="contactEmail"
                                label="Contact Email (Optional)"
                                fullWidth
                                disabled={isSubmitting}
                                type="email"
                            />
                        </Grid>

                        {submitSuccess || errorMsg ? (
                            <Grid item xs={12}>
                                {submitSuccess && (
                                    <Alert severity="success" sx={{ mb: 3 }}>
                                        Job post submitted successfully!
                                    </Alert>
                                )}

                                {errorMsg && (
                                    <Alert severity="error" sx={{ mb: 3 }}>
                                        {(errorMsg as any)?.error === 'FST_ERR_VALIDATION'
                                            ? `${(errorMsg as any).reason}`
                                            : errorMsg}
                                    </Alert>
                                )}
                            </Grid>
                        ) : null}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                                <LoadingButton
                                    type="submit"
                                    variant="contained"
                                    loading={isSubmitting}
                                    disabled={isSubmitting}>
                                    Add Job Post
                                </LoadingButton>

                                <Button
                                    variant="outlined"
                                    disabled={isSubmitting}
                                    onClick={async () => {
                                        const data = formContext.getValues()
                                        await submitJobPost(data, false)
                                        if (!errorMsg) {
                                            setTimeout(() => {
                                                // Preserve location and sponsorId when resetting form
                                                const { sponsorId, location } = formContext.getValues()
                                                reset({
                                                    sponsorId,
                                                    location,
                                                    title: '',
                                                    description: '',
                                                    externalLink: '',
                                                    category: '',
                                                    salary: '',
                                                    requirements: [],
                                                    contactEmail: '',
                                                })
                                                setSubmitSuccess(false)
                                            }, 1000)
                                        }
                                    }}>
                                    Add Post and Continue with Another
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </FormContainer>
            </Card>
        </Container>
    )
}
