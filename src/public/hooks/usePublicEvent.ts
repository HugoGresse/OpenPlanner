import { UseQueryResult } from '../../services/hooks/firestoreQueryHook'
import { useCallback, useEffect, useState } from 'react'
import { BaseAPIUrl } from './constants'
import { JsonPublicOutput } from '../../../functions/src/api/routes/deploy/updateWebsiteActions/jsonTypes'

type EventResponse = {
    eventName: string
    dataUrl: string
}

export const usePublicEvent = (eventId?: string): UseQueryResult<JsonPublicOutput> => {
    const [data, setData] = useState<JsonPublicOutput | null>(null)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const fetchData = useCallback(async () => {
        if (!eventId) return

        setIsLoading(true)
        setError('')

        try {
            const url = new URL(BaseAPIUrl as string)
            url.pathname += `v1/${eventId}/event`

            const eventResponse = await fetch(url.href)
            if (!eventResponse.ok) {
                const body = await eventResponse.json()
                throw new Error(`Failed to fetch event: ${eventResponse.statusText}, ${body.error}`)
            }

            const eventData = (await eventResponse.json()) as EventResponse
            if (!eventData.dataUrl) {
                throw new Error('No data URL available, did you forgot to "Update website" once?')
            }

            const cacheBuster = new Date().getTime()
            const dataUrl = `${eventData.dataUrl}?t=${cacheBuster}`

            const dataResponse = await fetch(dataUrl)
            if (!dataResponse.ok) {
                throw new Error(`Failed to fetch event data: ${dataResponse.statusText}`)
            }

            const publicData = (await dataResponse.json()) as JsonPublicOutput
            setData(publicData)
        } catch (err) {
            console.error(err)
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setIsLoading(false)
        }
    }, [eventId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return {
        data,
        error,
        isError: error !== '',
        isLoading,
        load: fetchData,
        loaded: data !== null,
    }
}
