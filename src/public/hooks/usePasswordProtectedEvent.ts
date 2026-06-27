import { PublicJSON, TranscriptionReply } from '../publicTypes'
import { BaseAPIUrl } from './constants'
import { useEffect, useState } from 'react'

export type PasswordProtectedEventState = {
    isLoading: boolean
    error: string | null
    reply: TranscriptionReply | null
    eventData: PublicJSON | null
}

/**
 * Generic hook to load an event's static public JSON behind the transcription page password.
 * Returns the transcription reply (event name, Gladia API key, data URL) and the parsed event data.
 * Used by the transcription/caption screen and the intermission screen.
 */
export const usePasswordProtectedEvent = (eventId: string, password: string): PasswordProtectedEventState => {
    const [state, setState] = useState<PasswordProtectedEventState>({
        isLoading: false,
        error: null,
        reply: null,
        eventData: null,
    })

    useEffect(() => {
        const load = async () => {
            try {
                setState((newState) => ({ ...newState, error: null, isLoading: true }))

                if (!password || password.length === 0) {
                    setState((newState) => ({ ...newState, isLoading: false, error: 'Missing password' }))
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
                    setState((newState) => ({
                        ...newState,
                        isLoading: false,
                        error: `HTTP error! status: ${apiResult.status}`,
                    }))
                    return
                }

                const reply = (await apiResult.json()) as TranscriptionReply

                setState((newState) => ({ ...newState, reply }))

                const urlEventData = new URL(`${reply.dataUrl}?t=${Date.now()}`)
                const eventDataResult = await fetch(urlEventData)

                if (!eventDataResult.ok) {
                    setState((newState) => ({
                        ...newState,
                        isLoading: false,
                        error: `HTTP error! status: ${eventDataResult.status}`,
                    }))
                    return
                }

                const eventData = (await eventDataResult.json()) as PublicJSON

                setState((newState) => ({ ...newState, isLoading: false, eventData }))
            } catch (error) {
                setState((newState) => ({ ...newState, isLoading: false, error: `Error! status: ${error}` }))
            }
        }

        load()
    }, [eventId, password])

    return state
}
