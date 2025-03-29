import { API_URL } from '../../../env'
import { BupherScheduledPost } from '../../../services/bupher/useBupherScheduledPosts'

export type BupherLoginResponse = {
    success: boolean
    error?: string
    cookies?: string
}

export type BupherChannelsResponse = {
    success: boolean
    error?: string
    channels: {
        avatarUrl: string
        type: string
        handle: string
        formatted_username: string
        id: string
    }[]
}

export type BupherScheduledPostsResponse = {
    success: boolean
    error?: string
    posts: BupherScheduledPost[]
}

export type BupherDraftPostResponse = {
    success: boolean
    error?: string
}

export type BupherProfile = {
    id: string
    type: 'twitter' | 'instagram' | 'facebook' | 'linkedin' | 'youtube' | 'tiktok'
}

export const bupherAPI = {
    login: async (eventId: string, apiKey: string, email: string, password: string): Promise<BupherLoginResponse> => {
        const url = new URL(API_URL as string)
        url.pathname += `v1/${eventId}/bupher/login`
        url.searchParams.append('apiKey', apiKey)

        try {
            const response = await fetch(url.href, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                return {
                    success: false,
                    error: errorData.error || `Error: ${response.statusText}`,
                }
            }

            return await response.json()
        } catch (error: any) {
            return {
                success: false,
                error: `Error: ${error.message}`,
            }
        }
    },
    getChannels: async (eventId: string, apiKey: string): Promise<BupherChannelsResponse> => {
        const url = new URL(API_URL as string)
        url.pathname += `v1/${eventId}/bupher/channels`
        url.searchParams.append('apiKey', apiKey)

        const response = await fetch(url.href, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        return await response.json()
    },
    getScheduledPosts: async (eventId: string, apiKey: string): Promise<BupherScheduledPostsResponse> => {
        const url = new URL(API_URL as string)
        url.pathname += `v1/${eventId}/bupher/scheduled-posts`
        url.searchParams.append('apiKey', apiKey)

        const response = await fetch(url.href, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        return await response.json()
    },
    postDraftPost: async (
        eventId: string,
        apiKey: string,
        profiles: BupherProfile[],
        text: string,
        file: File
    ): Promise<BupherDraftPostResponse> => {
        const url = new URL(API_URL as string)
        url.pathname += `v1/${eventId}/bupher/draft-post`
        url.searchParams.append('apiKey', apiKey)
        const formData = new FormData()
        formData.append('profiles', JSON.stringify(profiles))
        formData.append('text', text)
        formData.append('file', file)

        const response = await fetch(url.href, {
            method: 'POST',
            body: formData,
        })

        return await response.json()
    },
}
