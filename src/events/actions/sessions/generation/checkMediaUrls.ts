import { API_URL } from '../../../../env'

export type MediaCheckResult = {
    url: string
    ok: boolean
    status?: number
    error?: string
}

export type CheckMediaUrlsResult = {
    success: boolean
    results: MediaCheckResult[]
    inaccessibleUrls: MediaCheckResult[]
    message?: string
}

export const checkMediaUrls = async (
    eventId: string,
    eventApiKey: string,
    urls: string[]
): Promise<CheckMediaUrlsResult> => {
    const filteredUrls = urls.filter((url) => !!url)

    if (filteredUrls.length === 0) {
        return { success: true, results: [], inaccessibleUrls: [] }
    }

    const apiUrl = new URL(API_URL as string)
    const basePath = apiUrl.pathname.replace(/\/$/, '')
    apiUrl.pathname = `${basePath}/v1/${eventId}/check-media`
    apiUrl.searchParams.append('apiKey', eventApiKey)

    try {
        const response = await fetch(apiUrl.href, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ urls: filteredUrls }),
        })

        if (!response.ok) {
            return {
                success: false,
                results: [],
                inaccessibleUrls: [],
                message: `Failed to check media URLs: ${response.statusText}`,
            }
        }

        const data = await response.json()
        const results: MediaCheckResult[] = data.results
        const inaccessibleUrls = results.filter((r) => !r.ok)

        return {
            success: true,
            results,
            inaccessibleUrls,
        }
    } catch (error: any) {
        return {
            success: false,
            results: [],
            inaccessibleUrls: [],
            message: `Error checking media URLs: ${error?.message || 'Unknown error'}`,
        }
    }
}
