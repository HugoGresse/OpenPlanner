import { makeBupherGraphQLRequest, makePublishRequest, publishBrowserHeaders } from './bupherUtils'

interface S3PreSignedURLResponse {
    data: {
        s3PreSignedURL: {
            url: string
            key: string
            bucket: string
            __typename: string
        }
    }
}

const extractAwsCookies = (setCookieHeader: string | null): string | null => {
    if (!setCookieHeader) return null
    const cookies: string[] = []
    const awsalbtg = setCookieHeader.match(/AWSALBTG=([^;]+)/)
    if (awsalbtg) cookies.push(awsalbtg[0])
    const awsalbtgcors = setCookieHeader.match(/AWSALBTGCORS=([^;]+)/)
    if (awsalbtgcors) cookies.push(awsalbtgcors[0])
    return cookies.length > 0 ? cookies.join('; ') : null
}

const fetchAwsLoadBalancerCookies = async (bupherSession: string, organizationId: string): Promise<string | null> => {
    const path = '?_o=Get' + 'Composer' + 'ChannelsList'
    const response = await makeBupherGraphQLRequest(
        path,
        bupherSession,
        'POST',
        JSON.stringify({
            operationName: 'GetComposerChannelsList',
            variables: {
                input: { organizationId },
            },
            query: 'query GetComposerChannelsList($input: ChannelsInput!) {\n  channels(input: $input) {\n    id\n    ...ComposerChannelFragment\n    __typename\n  }\n}\n\nfragment ComposerChannelFragment on Channel {\n  id\n  name\n  displayName\n  service\n  type\n  avatar\n  locationData {\n    location\n    __typename\n  }\n  isLocked\n  isDisconnected\n  __typename\n}\n',
        })
    )
    return extractAwsCookies(response.headers.get('set-cookie'))
}

const getPreSignedUrl = async (
    bupherSession: string,
    organizationId: string,
    file: File
): Promise<{ success: boolean; result?: S3PreSignedURLResponse; error?: string }> => {
    const awsCookies = await fetchAwsLoadBalancerCookies(bupherSession, organizationId)
    const sessionWithAwsCookies = awsCookies ? `${bupherSession}; ${awsCookies}` : bupherSession

    const path = '?_o=s3' + 'PreSignedURL'
    const response = await makeBupherGraphQLRequest(
        path,
        sessionWithAwsCookies,
        'POST',
        JSON.stringify({
            operationName: 's3PreSignedURL',
            variables: {
                input: {
                    organizationId: organizationId,
                    fileName: file.name,
                    mimeType: file.type,
                    uploadType: 'postAsset',
                },
            },
            query: 'query s3PreSignedURL($input: S3PreSignedURLInput!) {\n s3PreSignedURL(input: $input) {\n url\n key\n bucket\n __typename\n }\n}',
        })
    )
    if (!response.ok) {
        return {
            success: false,
            error: response.statusText + ' ' + response.status,
        }
    }
    const result = (await response.json()) as S3PreSignedURLResponse
    return {
        success: true,
        result: result,
    }
}

const uploadFileToS3 = async (preSignedUrl: string, file: File) => {
    const headers: Record<string, string> = {
        ...publishBrowserHeaders,
        'Content-Type': file.type,
    }

    const response = await fetch(preSignedUrl, {
        method: 'PUT',
        body: file,
        headers: headers,
    })
    return response.ok
}

type UploadResponse = {
    result: {
        success: boolean
        upload_id: string
        details: {
            location: string
            file_size?: number
            file_extension?: string
            duration?: number
            duration_millis?: number
            width?: number
            height?: number
            format?: string
            video_format?: string
            frame_rate?: number
            video_bitrate?: number
            audio_codec?: string
            rotation?: number
            required_transcoding?: boolean
            transcoded_location?: string
        }
        location: string
        type: string
        width?: number
        height?: number
        thumbnail?: string
        transcodeVideo: boolean
        title?: string
    }
}
const getFileDetails = async (bupherSession: string, fileKey: string) => {
    const body = {
        args:
            '{"url":"/i/uploads/upload_media.json","args":{"key": "' +
            fileKey +
            '","serviceForceTranscodeVideo":false}}',
    }
    const response = await makePublishRequest('/rpc/composerApiProxy', bupherSession, 'POST', JSON.stringify(body))
    if (!response.ok) {
        return {
            success: false,
            error: response.statusText + ' ' + response.status,
        }
    }
    const result = (await response.json()) as UploadResponse
    return {
        success: true,
        result: result,
    }
}

/**
 * 3 steps:
 * 1. Get the pre-signed URL
 * 2. Upload the file to S3
 * 3. Get the file details
 *
 * @param bupherSession
 * @param organizationId
 * @param file
 * @returns
 */
export const postBupherFile = async (bupherSession: string, organizationId: string, file: File) => {
    const preSignedUrl = await getPreSignedUrl(bupherSession, organizationId, file)
    if (!preSignedUrl.success || !preSignedUrl.result || !preSignedUrl.result?.data?.s3PreSignedURL) {
        return {
            success: false,
            error: 'Failed to get pre-signed URL, ' + preSignedUrl.error,
        }
    }

    const uploadResponse = await uploadFileToS3(preSignedUrl.result.data.s3PreSignedURL.url, file)
    if (!uploadResponse) {
        return {
            success: false,
            error: 'Failed to upload file to S3, ' + preSignedUrl.result.data.s3PreSignedURL.url,
        }
    }
    const fileKey = preSignedUrl.result.data.s3PreSignedURL.key
    const fileDetails = await getFileDetails(bupherSession, fileKey)
    if (
        !fileDetails.success ||
        !fileDetails.result ||
        !fileDetails.result.result ||
        !fileDetails.result.result.upload_id
    ) {
        return {
            success: false,
            error: 'Failed to get file details, ' + fileDetails.error,
        }
    }

    const result = fileDetails.result.result
    const isVideo = result.type === 'video'

    return {
        success: true,
        result: {
            uploadId: result.upload_id,
            fileKey: fileKey,
            location: result.location,
            type: result.type,
            width: result.width,
            height: result.height,
            thumbnail: result.thumbnail,
            // Include video-specific details if it's a video
            ...(isVideo && {
                videoDetails: {
                    fileSize: result.details.file_size,
                    fileExtension: result.details.file_extension,
                    duration: result.details.duration,
                    durationMillis: result.details.duration_millis,
                    width: result.details.width,
                    height: result.details.height,
                    format: result.details.format,
                    videoFormat: result.details.video_format,
                    frameRate: result.details.frame_rate,
                    videoBitrate: result.details.video_bitrate,
                    audioCodec: result.details.audio_codec,
                    rotation: result.details.rotation,
                    requiredTranscoding: result.details.required_transcoding,
                    transcodedLocation: result.details.transcoded_location,
                },
                title: result.title,
            }),
        },
    }
}
