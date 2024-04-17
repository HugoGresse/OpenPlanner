import { API_URL } from '../../../../env'

export const generateShortVid = async (
    eventId: string,
    sessionId: string,
    eventApiKey: string,
    shortVidType: string,
    updateSession: boolean,
    settings: any
) => {
    const url = new URL(API_URL as string)
    url.pathname += `v1/${eventId}/sessions/${sessionId}/shortvid`

    url.searchParams.append('apiKey', eventApiKey)

    const response = await fetch(url.href, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            shortVidType,
            updateSession,
            settings,
        }),
    })

    if (!response.ok) {
        return {
            success: false,
            error: response.statusText,
        }
    }

    return await response.json()
}
