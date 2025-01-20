import { API_URL } from '../../../env'

export type BupherLoginResponse = {
    success: boolean
    error?: string
    cookies?: string
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
}
