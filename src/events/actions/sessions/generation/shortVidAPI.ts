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
    speaker?: ShortVidSpeakerInput
    speakers?: ShortVidSpeakerInput[]
} & ShortVidDesignSetting

export const shortVidAPI = async (
    eventId: string,
    sessionId: string,
    eventApiKey: string,
    shortVidType: string,
    updateSession: boolean,
    settings: ShortVidSettings
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
