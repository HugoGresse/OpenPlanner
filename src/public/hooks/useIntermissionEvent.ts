import { PublicJSON } from '../publicTypes'
import { BaseAPIUrl } from './constants'
import { useEffect, useState } from 'react'

export type IntermissionEventState = {
    isLoading: boolean
    error: string | null
    unauthorized: boolean
    eventData: PublicJSON | null
}

/**
 * Loads the intermission screen data. The password is OPTIONAL: it is only required when the event
 * defines an `intermissionPassword`. When required and missing/wrong the backend replies 401, which
 * surfaces here as `unauthorized` so the UI can prompt for it.
 */
export const useIntermissionEvent = (eventId: string, password: string): IntermissionEventState => {
    const [state, setState] = useState<IntermissionEventState>({
        isLoading: true,
        error: null,
        unauthorized: false,
        eventData: null,
    })

    useEffect(() => {
        const load = async () => {
            try {
                setState((s) => ({ ...s, isLoading: true, error: null, unauthorized: false }))

                const url = new URL(BaseAPIUrl as string)
                url.pathname += `v1/${eventId}/intermission`

                const apiResult = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        password: password || '',
                    },
                })

                if (apiResult.status === 401) {
                    setState((s) => ({ ...s, isLoading: false, unauthorized: true }))
                    return
                }

                if (!apiResult.ok) {
                    setState((s) => ({ ...s, isLoading: false, error: `HTTP error! status: ${apiResult.status}` }))
                    return
                }

                const reply = (await apiResult.json()) as { eventName: string; dataUrl: string }

                const eventDataResult = await fetch(`${reply.dataUrl}?t=${Date.now()}`)
                if (!eventDataResult.ok) {
                    setState((s) => ({
                        ...s,
                        isLoading: false,
                        error: `HTTP error! status: ${eventDataResult.status}`,
                    }))
                    return
                }

                const eventData = (await eventDataResult.json()) as PublicJSON
                setState((s) => ({ ...s, isLoading: false, eventData }))
            } catch (error) {
                setState((s) => ({ ...s, isLoading: false, error: `Error! status: ${error}` }))
            }
        }

        load()
    }, [eventId, password])

    return state
}
