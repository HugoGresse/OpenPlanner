import { PublicJSON, TranscriptionReply } from '../publicTypes'
import { BaseAPIUrl } from './constants'
import { useEffect, useState } from 'react'

export const useTranscription = (
    eventId: string,
    password: string
): [string | undefined | null, null | PublicJSON, boolean, string | null] => {
    const [state, setState] = useState<{
        isLoading: boolean
        error: string | null
        data: TranscriptionReply | null
        eventData: null | PublicJSON
    }>({
        isLoading: false,
        error: null,
        data: null,
        eventData: null,
    })

    useEffect(() => {
        const load = async () => {
            try {
                setState((newState) => {
                    return {
                        ...newState,
                        error: null,
                        isLoading: true,
                    }
                })

                if (!password || password.length === 0) {
                    setState((newState) => {
                        return {
                            ...newState,
                            isLoading: false,
                            error: 'Missing password',
                        }
                    })
                    return
                }

                const url = new URL(BaseAPIUrl as string)
                url.pathname += `v1/${eventId}/transcription`

                const apiResult = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        password: password,
                    },
                })

                if (!apiResult.ok) {
                    setState((newState) => {
                        return {
                            ...newState,
                            isLoading: false,
                            error: `HTTP error! status: ${apiResult.status}`,
                        }
                    })
                    return
                }

                const apiData = await apiResult.json()

                setState((newState) => {
                    return {
                        ...newState,
                        data: apiData,
                    }
                })
                const urlEventData = new URL(`${apiData.dataUrl}?t=${Date.now()}`)

                const eventDataResult = await fetch(urlEventData)

                if (!eventDataResult.ok) {
                    setState((newState) => {
                        return {
                            ...newState,
                            isLoading: false,
                            error: `HTTP error! status: ${eventDataResult.status}`,
                        }
                    })
                    return
                }

                const eventData = await eventDataResult.json()

                setState((newState) => {
                    return {
                        ...newState,
                        isLoading: false,
                        eventData: eventData,
                    }
                })
            } catch (error) {
                setState((newState) => {
                    return {
                        ...newState,
                        isLoading: false,
                        error: `Error! status: ${error}`,
                    }
                })
            }
        }

        load()
    }, [password])

    return [state.data?.gladiaAPIKey, state.eventData, state.isLoading, state.error]
}
