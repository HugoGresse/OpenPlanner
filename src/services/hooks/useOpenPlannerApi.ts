import { useState, useEffect } from 'react'
import { Event } from '../../types'
import { API_URL } from '../../env'

type ApiResponse<T> = {
    data: T | null
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
}

type RequestOptions = {
    method?: 'GET' | 'POST'
    body?: any
}

export async function fetchOpenPlannerApi<T>(
    event: Event,
    endpoint: string,
    options: RequestOptions = { method: 'GET' }
): Promise<T> {
    if (!event.apiKey) {
        throw new Error('No API key provided')
    }

    const url = new URL(API_URL as string)
    url.pathname += `v1/${event.id}/${endpoint}`
    url.searchParams.append('apiKey', event.apiKey)

    const fetchOptions: RequestInit = {
        method: options.method,
        headers: {
            'Content-Type': 'application/json',
        },
    }

    if (options.body && options.method === 'POST') {
        fetchOptions.body = JSON.stringify(options.body)
    }

    const response = await fetch(url.href, fetchOptions)
    if (!response.ok) {
        throw new Error(`Failed to fetch from ${endpoint}`)
    }
    return await response.json()
}

export const useOpenPlannerApi = <T>(
    event: Event,
    endpoint: string,
    options: RequestOptions = { method: 'GET' }
): ApiResponse<T> => {
    const [data, setData] = useState<T | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchData = async () => {
        if (!event.apiKey) return

        setIsLoading(true)
        setError(null)

        try {
            const responseData = await fetchOpenPlannerApi<T>(event, endpoint, options)
            setData(responseData)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
            console.error(`Error fetching from ${endpoint}:`, err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [event.apiKey, event.id, endpoint, options.method, JSON.stringify(options.body)])

    return { data, isLoading, error, refetch: fetchData }
}
