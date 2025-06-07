import { BaseAPIUrl } from '../hooks/constants'
import { JobPost } from '../../types'
import { JobPostForm } from './JobPostForm'
import { JobPostFormData } from '../hooks/useJobPostSubmission'
import { useApiCall, useApiUrl } from '../hooks/useApiCall'

export type SponsorJobFormProps = {
    eventId: string
    sponsorToken: string
    jobPost?: JobPost | null
    onSuccess: () => void
    onCancel: () => void
}

export const SponsorJobForm = ({ eventId, sponsorToken, jobPost, onSuccess, onCancel }: SponsorJobFormProps) => {
    const api = useApiCall()
    const buildUrl = useApiUrl(BaseAPIUrl as string)

    const submitJobPost = async (data: JobPostFormData) => {
        try {
            const endpoint = jobPost
                ? `v1/${eventId}/sponsors/job-posts/${jobPost.id}`
                : `v1/${eventId}/sponsors/job-posts`

            const cleanedData = Object.fromEntries(
                Object.entries(data).filter(([_, value]) => value !== undefined && value !== '')
            )

            const requestBody = {
                ...cleanedData,
                sponsorToken,
            }

            const url = buildUrl(endpoint)

            await api.execute(url, {
                method: jobPost ? 'PUT' : 'POST',
                body: requestBody,
                onSuccess: () => {
                    onSuccess()
                },
            })
        } catch (error) {
            console.error('Error submitting job post:', error)
        }
    }

    return (
        <JobPostForm
            isSubmitting={api.isLoading}
            errorMsg={api.error}
            jobPost={jobPost}
            onSubmit={submitJobPost}
            onCancel={onCancel}
            submitButtonText={jobPost ? 'Update job post' : 'Add job post'}
        />
    )
}
