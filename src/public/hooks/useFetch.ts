import { useCallback, useEffect, useState } from 'react'
import { UseQueryResult } from '../../services/hooks/firestoreQueryHook'

type FetchMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface FetchOptions {
    method: FetchMethod
    body?: any
}

export const useFetch = <T>(url: string, options: FetchOptions): UseQueryResult<T> => {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)

    const isError = error !== ''

    const load = useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await fetch(url, {
                method: options.method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(options.body),
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()
            setData(data)
        } catch (error) {
            setError((error as Error).message || `${error}`)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        // noinspection JSIgnoredPromiseFromCall
        load()
    }, [])

    return {
        data,
        error,
        isError,
        isLoading,
        load,
        loaded: data !== null,
    }
}
