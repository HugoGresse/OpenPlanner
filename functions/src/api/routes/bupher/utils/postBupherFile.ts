import { makeBupherGraphQLRequest, makePublishRequest, publishBrowserHeaders } from './bupherUtils'

interface S3UploadPreSignedURLResponse {
    data: {
        s3UploadPreSignedURL: {
            url: string
            key: string
            bucket: string
            __typename: string
        }
    }
}

const getPreSignedUrl = async (
    bupherSession: string,
    file: File
): Promise<{ success: boolean; result?: S3UploadPreSignedURLResponse; error?: string }> => {
    const path = '?_o=s3Upload' + 'PreSignedURL'
    const response = await makeBupherGraphQLRequest(
        path,
        bupherSession,
        'POST',
        JSON.stringify({
            operationName: 's3UploadPreSignedURL',
            variables: {
                input: { fileName: file.name, mimeType: file.type, uploadType: 'postAsset' },
            },
            query: 'query s3UploadPreSignedURL($input: S3UploadPreSignedURLInput!) {\n  s3UploadPreSignedURL(input: $input) {\n    url\n    key\n    bucket\n    __typename\n  }\n}\n',
        })
    )
    if (!response.ok) {
        return {
            success: false,
            error: response.statusText + ' ' + response.status,
        }
    }
    const result = (await response.json()) as S3UploadPreSignedURLResponse
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
        }
        location: string
        type: string
        width: number
        height: number
        thumbnail: string
        transcodeVideo: boolean
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
    const preSignedUrl = await getPreSignedUrl(bupherSession, file)
    if (!preSignedUrl.success || !preSignedUrl.result || !preSignedUrl.result?.data?.s3UploadPreSignedURL) {
        return {
            success: false,
            error: 'Failed to get pre-signed URL, ' + preSignedUrl.error,
        }
    }

    const uploadResponse = await uploadFileToS3(preSignedUrl.result.data.s3UploadPreSignedURL.url, file)
    if (!uploadResponse) {
        return {
            success: false,
            error: 'Failed to upload file to S3, ' + preSignedUrl.result.data.s3UploadPreSignedURL.url,
        }
    }
    const fileKey = preSignedUrl.result.data.s3UploadPreSignedURL.key
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

    return {
        success: true,
        result: {
            uploadId: fileDetails.result.result.upload_id,
            fileKey: fileKey,
            location: fileDetails.result.result.location,
            type: fileDetails.result.result.type,
            width: fileDetails.result.result.width,
            height: fileDetails.result.result.height,
            thumbnail: fileDetails.result.result.thumbnail,
        },
    }
}
