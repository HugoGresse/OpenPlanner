import { useState, useCallback } from 'react'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface ApiCallOptions {
    method?: HttpMethod
    body?: any
    headers?: Record<string, string>
    skipErrorHandling?: boolean
    onError?: (error: Error, response?: Response) => void
    onSuccess?: (data: any, response: Response) => void
}

interface ApiCallResult<T> {
    data: T | null
    isLoading: boolean
    error: string
    isError: boolean
    clearError: () => void
    execute: (url: string, options?: ApiCallOptions) => Promise<T>
    reset: () => void
}

/**
 * Generic hook for making API calls with built-in loading, error, and data state management.
 *
 * @template T - The expected type of the API response data
 * @returns ApiCallResult with state and methods for making API calls
 *
 * @example
 * ```typescript
 * const api = useApiCall<UserData>()
 *
 * const loadUser = async (userId: string) => {
 *   try {
 *     const user = await api.execute(`/api/users/${userId}`)
 *     console.log('User loaded:', user)
 *   } catch (error) {
 *     // Error is already stored in api.error
 *   }
 * }
 *
 * return (
 *   <div>
 *     {api.isLoading && <p>Loading...</p>}
 *     {api.error && <p>Error: {api.error}</p>}
 *     {api.data && <p>Welcome, {api.data.name}!</p>}
 *   </div>
 * )
 * ```
 */
export const useApiCall = <T = any>(): ApiCallResult<T> => {
    const [data, setData] = useState<T | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const clearError = useCallback(() => {
        setError('')
    }, [])

    const reset = useCallback(() => {
        setData(null)
        setError('')
        setIsLoading(false)
    }, [])

    const execute = useCallback(async (url: string, options: ApiCallOptions = {}): Promise<T> => {
        const { method = 'GET', body, headers = {}, skipErrorHandling = false, onError, onSuccess } = options

        setIsLoading(true)
        if (!skipErrorHandling) {
            setError('')
        }

        try {
            const fetchOptions: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
            }

            if (body && (method === 'POST' || method === 'PUT')) {
                fetchOptions.body = JSON.stringify(body)
            }

            const response = await fetch(url, fetchOptions)

            if (!response.ok) {
                const errorText = await response.text()
                const error = new Error(errorText || `HTTP error! status: ${response.status}`)

                // Call custom error handler if provided
                if (onError) {
                    onError(error, response)
                }

                throw error
            }

            const responseData = await response.json()
            setData(responseData)

            // Call custom success handler if provided
            if (onSuccess) {
                onSuccess(responseData, response)
            }

            return responseData
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred'
            if (!skipErrorHandling) {
                setError(errorMessage)
            }
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    return {
        data,
        isLoading,
        error,
        isError: error !== '',
        clearError,
        execute,
        reset,
    }
}

/**
 * Helper hook for building API URLs with query parameters.
 *
 * @param baseUrl - The base URL for the API
 * @returns A function that builds URLs with the given endpoint and parameters
 *
 * @example
 * ```typescript
 * const buildUrl = useApiUrl('https://api.example.com')
 * const url = buildUrl('v1/users', { page: '1', limit: '10' })
 * // Results in: https://api.example.com/v1/users?page=1&limit=10
 * ```
 */
export const useApiUrl = (baseUrl: string) => {
    return useCallback(
        (endpoint: string, params: Record<string, string> = {}) => {
            const url = new URL(baseUrl)
            url.pathname += endpoint

            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value)
            })

            return url.href
        },
        [baseUrl]
    )
}
