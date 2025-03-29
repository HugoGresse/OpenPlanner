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

type NetworkType = 'twitter' | 'instagram' | 'facebook' | 'linkedin' | 'youtube' | 'tiktok'

type Profile = {
    id: string
    type: NetworkType
}

const createDraftBody = (
    profile: Profile,
    text: string,
    photoUrl?: string,
    photoSize?: { width: number; height: number }
) => {
    const baseArgs = {
        now: false,
        top: false,
        is_draft: true,
        shorten: true,
        text,
        scheduling_type: 'direct',
        fb_text: '',
        entities: null,
        annotations: [],
        profile_ids: [profile.id],
        attachment: false,
        via: null,
        source: null,
        version: null,
        duplicated_from: null,
        created_source: 'allChannels',
        channel_data: null as {
            twitter?: {
                scheduling_type: string
            }
            instagram?: any
            facebook?: any
            linkedin?: any
            youtube?: any
            tiktok?: any
        } | null,
        tags: [],
        media: photoUrl
            ? {
                  progress: 100,
                  uploaded: true,
                  photo: photoUrl,
                  picture: photoUrl,
                  thumbnail: photoUrl,
                  alt_text: null,
                  source: { name: 'localFile', trigger: 'dragAndDrop' },
                  height: photoSize?.height,
                  width: photoSize?.width,
                  ai_assisted: false,
              }
            : null,
        HTTPMethod: 'POST',
    }
    // Add network-specific configurations based on profile type
    const networkConfigs = {} as Record<NetworkType, any>
    switch (profile.type) {
        case 'twitter':
            // nothing specific
            break
        case 'instagram':
            // nothing specific
            break
        case 'facebook':
            // Facebook specific configurations
            break
        case 'linkedin':
            networkConfigs.linkedin = {
                update_type: 'post',
            }
            break
        case 'youtube':
            // YouTube specific configurations
            break
        case 'tiktok':
            // TikTok specific configurations
            break
    }

    if (Object.keys(networkConfigs).length > 0) {
        baseArgs.channel_data = networkConfigs
    }

    return {
        args: JSON.stringify({
            url: '/1/updates/create.json',
            args: baseArgs,
        }),
    }
}

export const postBupherDraft = async (
    bupherSession: string,
    profiles: Profile[],
    text: string,
    options?: {
        photoUrl?: string
        photoSize?: { width: number; height: number }
    }
) => {
    const results = await Promise.all(
        profiles.map(async (profile) => {
            const body = createDraftBody(profile, text, options?.photoUrl, options?.photoSize)
            console.log(`Posting draft for profile ${profile.id} (${profile.type})`)
            const response = await makePublishRequest(
                '/rpc/composerApiProxy',
                bupherSession,
                'POST',
                JSON.stringify(body)
            )
            if (!response.ok) {
                return {
                    success: false,
                    profile,
                    error: response.statusText + ' ' + response.status,
                }
            }
            const result = (await response.json()) as PostDraftResponse
            return {
                success: true,
                profile,
                result: result,
            }
        })
    )

    // Check if all requests were successful
    const allSuccessful = results.every((r) => r.success)
    return {
        success: allSuccessful,
        results,
    }
}
