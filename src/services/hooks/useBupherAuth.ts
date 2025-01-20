import { useState } from 'react'
import { bupherAPI } from '../../events/actions/social/bupherAPI'
import { useEvent } from './useEvent'

export type BupherAuthState = {
    isLoggedIn: boolean
    isLoading: boolean
    error: string | null
    cookies?: string
}

export const useBupherAuth = (eventId: string) => {
    const [authState, setAuthState] = useState<BupherAuthState>({
        isLoggedIn: false,
        isLoading: false,
        error: null,
    })
    const event = useEvent(eventId)

    const login = async (email: string, password: string) => {
        if (!event.data?.apiKey) {
            setAuthState({
                isLoggedIn: false,
                isLoading: false,
                error: 'No API key found for this event',
            })
            return false
        }

        setAuthState((prev) => ({ ...prev, isLoading: true, error: null }))

        try {
            const response = await bupherAPI.login(eventId, event.data.apiKey, email, password)

            if (!response.success || !response.cookies) {
                setAuthState({
                    isLoggedIn: false,
                    isLoading: false,
                    error: response.error || 'Login failed',
                })
                return false
            }

            setAuthState({
                isLoggedIn: true,
                isLoading: false,
                error: null,
                cookies: response.cookies,
            })
            return true
        } catch (error) {
            setAuthState({
                isLoggedIn: false,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to login',
            })
            return false
        }
    }

    const logout = () => {
        setAuthState({
            isLoggedIn: false,
            isLoading: false,
            error: null,
            cookies: undefined,
        })
    }

    return {
        ...authState,
        login,
        logout,
    }
}
