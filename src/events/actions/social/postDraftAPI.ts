import { API_URL } from '../../../env'
import { BupherProfile } from './bupherAPI'

interface PostDraftRequest {
    eventId: string
    apiKey: string
    profiles: BupherProfile[]
    content?: string
    contentMap?: Record<string, string>
    file: File
}

interface PostDraftResponse {
    success: boolean
    error?: string
    draftId?: string
}

export const postDraftToBupher = async (request: PostDraftRequest): Promise<PostDraftResponse> => {
    try {
        const url = new URL(API_URL as string)
        url.pathname += `v1/${request.eventId}/bupher/draft-post`
        url.searchParams.append('apiKey', request.apiKey)

        const formData = new FormData()
        formData.append('profiles', JSON.stringify(request.profiles))

        // Handle both string content and map of profile IDs to content
        if (request.content) {
            formData.append('text', request.content)
        } else if (request.contentMap) {
            formData.append('contentMap', JSON.stringify(request.contentMap))
        } else {
            return { success: false, error: 'No content provided' }
        }

        formData.append('file', request.file)

        const response = await fetch(url.href, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            return {
                success: false,
                error: errorData.message || `HTTP error ${response.status}: ${response.statusText}`,
            }
        }

        const data = await response.json()
        return {
            success: true,
            draftId: data.draftId,
        }
    } catch (error) {
        console.error('Error posting draft to Bupher:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}
