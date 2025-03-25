import { makePublishRequest } from './bupherUtils'

type PostDraftResponse = {
    result: {
        updates: Array<{
            _id: string
            ai_assisted: boolean
            channel_data: {
                twitter: {
                    scheduling_type: string
                }
            }
            client_id: string
            created_at: number
            draft: boolean
            id: string
            is_video_processing: boolean
            library_update_id: string
            media: {
                progress: string
                uploaded: string
                thumbnail: string
                source: {
                    name: string
                    trigger: string
                }
                height: string
                width: string
                picture: string
            }
            needs_approval: boolean
            organization_id: string
            perm_approvable: boolean
            perm_editable: boolean
            pinned: boolean
            profile_id: string
            profile_service: string
            profile_timezone: string
            scheduling_type: string
            shared_now: boolean
            status: string
            tagging_page_location: boolean
            tags: any[]
            text: string
            text_formatted: string
            text_md5: string
            twentyfour_hour_time: boolean
            type: string
            updated_at: number
            user: {
                email: string
                name: string
                gravatar: string
                avatar: string
            }
            user_id: string
            via: string
            client: {
                _id: string
                description: string
                id: string
                name: string
                organization: string
                organization_website: string
                website: string
                icons: {
                    [key: string]: string
                }
            }
        }>
        buffer_percentage: number
        buffer_count: number
        success: boolean
        message: string
        code: boolean | null
    }
}

export const postBupherDraft = async (
    bupherSession: string,
    profilIds: string[],
    text: string,
    photoUrl?: string,
    photoSize?: { width: number; height: number }
) => {
    const body = {
        args: `{"url":"/1/updates/create.json","args":{"now":false,"top":false,"is_draft":true,"shorten":true,"text":"${text}","scheduling_type":"direct","fb_text":"","entities":null,"annotations":[],"profile_ids":${profilIds},"attachment":false,"via":null,"source":null,"version":null,"duplicated_from":null,"created_source":"allChannels","channel_data":null,"tags":[],"media":{"progress":100,"uploaded":true,"photo":"${photoUrl}","picture":"${photoUrl}","thumbnail":"${photoUrl}","alt_text":null,"source":{"name":"localFile","trigger":"dragAndDrop"},"height":${photoSize?.height},"width":${photoSize?.width},"ai_assisted":false},"HTTPMethod":"POST"}`,
    }

    console.log(body)
    const response = await makePublishRequest('/rpc/composerApiProxy', bupherSession, 'POST', JSON.stringify(body))
    if (!response.ok) {
        return {
            success: false,
            error: response.statusText + ' ' + response.status,
        }
    }
    const result = (await response.json()) as PostDraftResponse
    return {
        success: true,
        result: result,
    }
}
