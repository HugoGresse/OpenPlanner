import { useState, useEffect, useCallback } from 'react'
import { bupherAPI } from '../../events/actions/social/bupherAPI'
import { useBupherAuth } from './useBupherAuth'
import { Event } from '../../types'

export type BupherScheduledPost = {
    id: string
    text: string
    scheduledAt: string
    channelId: string
    channelName: string
    service: string
    status: string
    imageUrl: string
}

export type BupherScheduledPostsState = {
    posts: BupherScheduledPost[]
    isLoaded: boolean
    isLoading: boolean
    error: string | null
}

export const useBupherScheduledPosts = (event: Event) => {
    const [state, setState] = useState<BupherScheduledPostsState>({
        posts: [],
        isLoaded: false,
        isLoading: false,
        error: null,
    })
    const auth = useBupherAuth(event)

    const fetchPosts = useCallback(async () => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }))

        try {
            const response = await bupherAPI.getScheduledPosts(event.id, event.apiKey || '')

            if (!response.success) {
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: response.error || 'Failed to fetch scheduled posts',
                }))
                return false
            }

            setState({
                posts: response.posts,
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
            fetchPosts()
        }
    }, [auth.isLoggedIn, state.isLoaded, state.isLoading, fetchPosts, state.error])

    const refreshPosts = () => {
        setState((prev) => ({ ...prev, isLoaded: false }))
        return fetchPosts()
    }

    return {
        ...state,
        fetchPosts,
        refreshPosts,
    }
}
