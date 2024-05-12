import { API_URL } from '../../../../env'

export type ShortVidDesignSetting = {
    backgroundColor: string
    title: string
    startingDate: string
    logoUrl: string
    location: string | null
}

export type ShortVidSpeakerInput = {
    pictureUrl: string
    name: string
    company: string
    job: string | null
}

export type ShortVidSettings = {
    speakers?: ShortVidSpeakerInput[]
} & ShortVidDesignSetting

export const shortVidAPI = async (
    eventId: string,
    sessionId: string,
    eventApiKey: string,
    shortVidType: string,
    updateSession: boolean,
    settings: ShortVidSettings,
    frame?: number
) => {
    const url = new URL(API_URL as string)
    url.pathname += `v1/${eventId}/sessions/${sessionId}/shortvid`

    url.searchParams.append('apiKey', eventApiKey)

    try {
        const response = await fetch(url.href, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                shortVidType,
                updateSession,
                settings,
                frame,
            }),
        })
        if (!response.ok) {
            return {
                success: false,
                message: `Error: ${response.statusText} - ${response.status} - ${response.type}`,
            }
        }

        return await response.json()
    } catch (error: any) {
        return {
            success: false,
            message: `Error: ${error!.message}`,
            results: [],
        }
    }
}
