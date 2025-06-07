import { useState, useEffect, useCallback } from 'react'
import { JobPost } from '../../types'
import { BaseAPIUrl } from './constants'
import { useApiCall, useApiUrl } from './useApiCall'

type SponsorData = {
    id: string
    name: string
    logoUrl: string
    website: string | null
}

type SponsorJobsData = {
    sponsor: SponsorData
    jobPosts: JobPost[]
}

type UseSponsorJobManagementResult = {
    // Data
    sponsor: SponsorData | null
    jobPosts: JobPost[]

    // Loading states
    isLoading: boolean
    isSubmitting: boolean

    // Error handling
    error: string
    clearError: () => void

    // Actions
    loadJobPosts: () => Promise<void>
    deleteJobPost: (jobPostId: string) => Promise<void>
}

export const useSponsorJobManagement = (
    eventId: string,
    sponsorToken: string | null
): UseSponsorJobManagementResult => {
    const [sponsor, setSponsor] = useState<SponsorData | null>(null)
    const [jobPosts, setJobPosts] = useState<JobPost[]>([])

    // Use the generic API hooks
    const loadApi = useApiCall<SponsorJobsData>()
    const deleteApi = useApiCall<void>()
    const buildApiUrl = useApiUrl(BaseAPIUrl as string)

    // Combine loading states
    const isLoading = loadApi.isLoading
    const isSubmitting = deleteApi.isLoading

    // Combine errors (prioritize delete errors for user feedback)
    const error = deleteApi.error || loadApi.error

    const clearError = useCallback(() => {
        loadApi.clearError()
        deleteApi.clearError()
    }, []) // Empty deps since clearError functions are stable

    const loadJobPosts = useCallback(async () => {
        if (!sponsorToken) {
            // Clear any existing errors and don't proceed
            loadApi.clearError()
            deleteApi.clearError()
            return
        }

        try {
            const url = buildApiUrl(`v1/${eventId}/sponsors/job-posts`, {
                sponsorToken,
            })

            const data = await loadApi.execute(url)
            setSponsor(data.sponsor)
            setJobPosts(data.jobPosts)
        } catch (err) {
            // Error is already handled by the API hook
        }
    }, [eventId, sponsorToken, buildApiUrl]) // Remove API hook functions from deps

    const deleteJobPost = useCallback(
        async (jobPostId: string) => {
            if (!sponsorToken) {
                return
            }

            try {
                const url = buildApiUrl(`v1/${eventId}/sponsors/job-posts/${jobPostId}`, {
                    sponsorToken,
                })

                await deleteApi.execute(url, { method: 'DELETE' })

                // Reload job posts after successful deletion
                await loadJobPosts()
            } catch (err) {
                // Error is already handled by the API hook
            }
        },
        [eventId, sponsorToken, buildApiUrl, loadJobPosts]
    )

    // Load job posts on mount and when dependencies change
    useEffect(() => {
        if (sponsorToken && eventId) {
            loadJobPosts()
        }
    }, [loadJobPosts, sponsorToken, eventId])

    return {
        sponsor,
        jobPosts,
        isLoading,
        isSubmitting,
        error,
        clearError,
        loadJobPosts,
        deleteJobPost,
    }
}
