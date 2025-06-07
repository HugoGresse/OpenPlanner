import { Box, Button, FormControl, FormHelperText, Grid, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { FormContainer, SelectElement, TextFieldElement, useForm } from 'react-hook-form-mui'
import { JOB_CATEGORIES } from './JOB_CATEGORIES'
import { JobPost } from '../../types'
import MDEditor from '@uiw/react-md-editor'
import { Controller } from 'react-hook-form'
import { JobPostFormData } from '../hooks/useJobPostSubmission'

export interface JobPostFormProps {
    isSubmitting: boolean
    errorMsg?: string
    jobPost?: JobPost | null
    showSponsorSelect?: boolean
    sponsorOptions?: Array<{ id: string; label: string }>
    onSubmit: (data: JobPostFormData) => Promise<void>
    onCancel?: () => void
    submitButtonText?: string
    cancelButtonText?: string
}

export const JobPostForm = ({
    isSubmitting,
    errorMsg,
    jobPost,
    showSponsorSelect = false,
    sponsorOptions = [],
    onSubmit,
    onCancel,
    submitButtonText = 'Submit',
    cancelButtonText = 'Cancel',
}: JobPostFormProps) => {
    const formContext = useForm<JobPostFormData>({
        defaultValues: jobPost
            ? {
                  sponsorId: '',
                  title: jobPost.title,
                  description: jobPost.description,
                  location: jobPost.location,
                  externalLink: jobPost.externalLink,
                  category: jobPost.category,
                  salary: jobPost.salary || '',
                  contactEmail: jobPost.contactEmail || '',
              }
            : {
                  sponsorId: '',
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

    const { formState, control } = formContext

    return (
        <FormContainer formContext={formContext} onSuccess={onSubmit}>
            <Grid container spacing={3} sx={{ mt: 1 }}>
                {showSponsorSelect && (
                    <Grid item xs={12}>
                        <SelectElement
                            name="sponsorId"
                            label="Sponsor"
                            required
                            fullWidth
                            disabled={isSubmitting}
                            options={sponsorOptions}
                        />
                        <FormHelperText>Select which sponsor this job belongs to</FormHelperText>
                    </Grid>
                )}

                <Grid item xs={12}>
                    <TextFieldElement name="title" label="Job Title" required fullWidth disabled={isSubmitting} />
                </Grid>

                <Grid item xs={12}>
                    <FormControl fullWidth>
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>
                            Job Description (in Markdown) *
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
                                        minHeight={showSponsorSelect ? 500 : 400}
                                        height="100%"
                                        onChange={(value) => field.onChange(value || '')}
                                        style={{ backgroundColor: 'transparent' }}
                                    />
                                )}
                            />
                        </Box>
                        {formState.errors.description && <FormHelperText error>Description is required</FormHelperText>}
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

                {errorMsg && (
                    <Grid item xs={12}>
                        <Typography color="error">{errorMsg}</Typography>
                    </Grid>
                )}

                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        {onCancel && (
                            <Button onClick={onCancel} disabled={isSubmitting}>
                                {cancelButtonText}
                            </Button>
                        )}
                        <LoadingButton type="submit" variant="contained" loading={isSubmitting} disabled={isSubmitting}>
                            {submitButtonText}
                        </LoadingButton>
                    </Box>
                </Grid>
            </Grid>
        </FormContainer>
    )
}

// Re-export the JobPostFormData type for convenience
export type { JobPostFormData }
