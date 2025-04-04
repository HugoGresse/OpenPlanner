import { useState, useEffect, useCallback } from 'react'
import { bupherAPI } from '../../events/actions/social/bupherAPI'
import { useBupherAuth } from './useBupherAuth'
import { Event } from '../../types'

export type BupherChannel = {
    avatarUrl: string
    type: string
    handle: string
    formatted_username: string
    id: string
}

export type BupherChannelsState = {
    channels: BupherChannel[]
    isLoaded: boolean
    isLoading: boolean
    error: string | null
}

export const useBupherChannels = (event: Event) => {
    const [state, setState] = useState<BupherChannelsState>({
        channels: [],
        isLoaded: false,
        isLoading: false,
        error: null,
    })
    const auth = useBupherAuth(event)

    const fetchChannels = useCallback(async () => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }))

        try {
            const response = await bupherAPI.getChannels(event.id, event.apiKey || '')

            if (!response.success) {
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: response.error || 'Failed to fetch channels',
                }))
                return false
            }

            setState({
                channels: response.channels,
                isLoaded: true,
                isLoading: false,
                error: null,
            })
            return true
        } catch (error) {
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to fetch channels',
            }))
            return false
        }
    }, [event.id, event.apiKey, auth.isLoggedIn])

    // Auto-fetch channels when user is logged in
    useEffect(() => {
        if (auth.isLoggedIn && !state.isLoaded && !state.isLoading && !state.error) {
            fetchChannels()
        }
    }, [auth.isLoggedIn, state.isLoaded, state.isLoading, fetchChannels, state.error])

    const refreshChannels = () => {
        setState((prev) => ({ ...prev, isLoaded: false }))
        return fetchChannels()
    }

    return {
        ...state,
        fetchChannels,
        refreshChannels,
    }
}
