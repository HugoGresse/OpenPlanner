import { useEffect, useState } from 'react'
import { bupherAPI } from '../../events/actions/social/bupherAPI'
import { Event } from '../../types'

export type BupherAuthState = {
    isLoggedIn: boolean
    isLoading: boolean
    error: string | null
    cookies?: string
}

export const useBupherAuth = (event: Event) => {
    const [authState, setAuthState] = useState<BupherAuthState>({
        isLoggedIn: event.bupherSession !== undefined,
        isLoading: false,
        error: null,
    })

    useEffect(() => {
        if (!event) {
            return
        }

        setAuthState((state) => {
            if (state.isLoading) {
                return state
            }
            return {
                ...state,
                isLoggedIn: event.bupherSession !== undefined,
            }
        })
    }, [event])

    const login = async (email: string, password: string) => {
        if (!event?.apiKey) {
            setAuthState({
                isLoggedIn: false,
                isLoading: false,
                error: 'No API key found for this event',
            })
            return false
        }

        setAuthState((prev) => ({ ...prev, isLoading: true, error: null }))

        try {
            const response = await bupherAPI.login(event.id, event.apiKey, email, password)

            if (!response.success) {
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
