import { useState, useCallback } from 'react'
import { useApiCall, useApiUrl } from './useApiCall'
import { BaseAPIUrl } from './constants'

export interface JobPostFormData {
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

interface JobPostSubmissionResult {
    isSubmitting: boolean
    submitSuccess: boolean
    error: string
    clearError: () => void
    clearSuccess: () => void
    submitJobPost: (
        data: JobPostFormData,
        options?: {
            resetForm?: () => void
            customErrorHandler?: (error: Error, response?: Response) => string
        }
    ) => Promise<void>
}

export const useJobPostSubmission = (eventId: string, privateId: string | null): JobPostSubmissionResult => {
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [customError, setCustomError] = useState('')

    const api = useApiCall()
    const buildApiUrl = useApiUrl(BaseAPIUrl as string)

    const clearError = useCallback(() => {
        setCustomError('')
        api.clearError()
    }, [api.clearError])

    const clearSuccess = useCallback(() => {
        setSubmitSuccess(false)
    }, [])

    const submitJobPost = useCallback(
        async (
            data: JobPostFormData,
            options: {
                resetForm?: () => void
                customErrorHandler?: (error: Error, response?: Response) => string
            } = {}
        ) => {
            const { resetForm, customErrorHandler } = options

            if (!privateId) {
                setCustomError('Missing private ID')
                return
            }

            // Clear previous states
            setSubmitSuccess(false)
            setCustomError('')

            try {
                const url = buildApiUrl(`v1/${eventId}/sponsors/jobPosts`)

                // Clean the data by removing undefined and empty values
                const cleanedData = Object.fromEntries(
                    Object.entries(data).filter(([_, value]) => value !== undefined && value !== '')
                )

                await api.execute(url, {
                    method: 'POST',
                    body: {
                        ...cleanedData,
                        addJobPostPrivateId: privateId,
                    },
                    onError: (error, response) => {
                        if (customErrorHandler) {
                            const customMessage = customErrorHandler(error, response)
                            setCustomError(customMessage)
                        } else {
                            // Default error handling for job posts
                            let errorMessage = error.message

                            try {
                                const errorJson = JSON.parse(error.message)
                                if (errorJson.error === 'FST_ERR_VALIDATION') {
                                    errorMessage = errorJson.reason || 'Validation failed'
                                } else if (errorJson.error && errorJson.error.length > 0) {
                                    errorMessage = errorJson.error
                                }
                            } catch {
                                // If parsing fails, use the original message
                            }

                            setCustomError(errorMessage)
                        }
                    },
                    onSuccess: () => {
                        setSubmitSuccess(true)

                        // Auto-clear success message after 10 seconds
                        setTimeout(() => {
                            setSubmitSuccess(false)
                        }, 10000)

                        // Reset form if provided
                        if (resetForm) {
                            resetForm()
                        }
                    },
                })
            } catch (error) {
                // Error is already handled by onError callback
                console.error('Error submitting job post:', error)
            }
        },
        [eventId, privateId, api, buildApiUrl]
    )

    return {
        isSubmitting: api.isLoading,
        submitSuccess,
        error: customError || api.error,
        clearError,
        clearSuccess,
        submitJobPost,
    }
}
