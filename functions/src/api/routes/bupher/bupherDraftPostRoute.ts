import { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import { getBupherSessionAndUserId, sendErrorResponse } from './utils/bupherUtils'
import { postBupherFile } from './utils/postBupherFile'
import { extractMultipartFormData } from '../file/utils/parseMultipartFiles'
import { checkFileTypes } from '../../other/checkFileTypes'
import { postBupherDraft } from './utils/postBupherDraft'

const BupherDraftPostResponse = Type.Object({
    success: Type.Boolean(),
    error: Type.Optional(Type.String()),
})

export const bupherDraftPostRoute = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post(
        '/v1/:eventId/bupher/draft-post',
        {
            schema: {
                tags: ['bupher'],
                summary: 'Post a draft post to Bupher',
                querystring: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        apiKey: {
                            type: 'string',
                            description: 'The API key of the event',
                        },
                    },
                },
                response: {
                    200: BupherDraftPostResponse,
                    400: Type.Object({
                        error: Type.String(),
                    }),
                },
                security: [
                    {
                        apiKey: [],
                    },
                ],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            try {
                const { eventId } = request.params as { eventId: string }

                // Get the Bupher session
                let bupherInfos = {
                    bupherSession: '',
                    bupherOrganizationId: '',
                }
                try {
                    bupherInfos = await getBupherSessionAndUserId(fastify.firebase, eventId)
                } catch (error) {
                    return sendErrorResponse(reply, 401, 'No Bupher session found. Please login first.')
                }

                const fileParsingResult = await extractMultipartFormData(request.raw)
                if (
                    !fileParsingResult ||
                    !fileParsingResult.uploads ||
                    Object.keys(fileParsingResult.uploads).length === 0
                ) {
                    return sendErrorResponse(reply, 400, 'Missing file(s)')
                }

                const profiles = JSON.parse(fileParsingResult.fields.profiles as string) as {
                    id: string
                    type: 'twitter' | 'instagram' | 'facebook' | 'linkedin' | 'youtube' | 'tiktok'
                }[]

                // Get text or contentMap from the form data
                let text: string | Record<string, string> = fileParsingResult.fields.text as string

                // Check if contentMap is provided
                if (fileParsingResult.fields.contentMap) {
                    try {
                        text = JSON.parse(fileParsingResult.fields.contentMap as string) as Record<string, string>
                    } catch (error) {
                        console.error('Error parsing contentMap:', error)
                        return sendErrorResponse(reply, 400, 'Invalid contentMap format')
                    }
                }

                console.info('Posting to bupher with profiles', profiles, 'and text', text)

                const firstFileKey = Object.keys(fileParsingResult.uploads)[0] as string
                const fileBuffer = fileParsingResult.uploads[firstFileKey] as Buffer
                const fileType = await checkFileTypes(fileBuffer, firstFileKey)
                if (!fileType) {
                    return sendErrorResponse(reply, 400, 'Invalid file type')
                }
                const isVideo = fileType.mime.startsWith('video/')
                const file = new File([fileBuffer], firstFileKey, { type: fileType.mime })

                // Process thumbnail file if provided
                let thumbnailUrl: string | undefined
                const thumbnailKey = Object.keys(fileParsingResult.uploads)[1] as string | undefined
                if (isVideo && thumbnailKey) {
                    const thumbnailBuffer = fileParsingResult.uploads[thumbnailKey] as Buffer
                    const thumbnailType = await checkFileTypes(thumbnailBuffer, thumbnailKey)

                    if (thumbnailType && thumbnailType.mime.startsWith('image/')) {
                        const thumbnailFile = new File([thumbnailBuffer], thumbnailKey, { type: thumbnailType.mime })
                        const thumbnailResponse = await postBupherFile(
                            bupherInfos.bupherSession,
                            bupherInfos.bupherOrganizationId,
                            thumbnailFile
                        )

                        if (thumbnailResponse.success && thumbnailResponse.result?.location) {
                            thumbnailUrl = thumbnailResponse.result.location
                        }
                    }
                }

                const fileResponse = await postBupherFile(
                    bupherInfos.bupherSession,
                    bupherInfos.bupherOrganizationId,
                    file
                )

                if (!fileResponse.success) {
                    console.log('fileResponse', fileResponse)
                }

                if (!fileResponse.success) {
                    return sendErrorResponse(reply, 500, 'Failed to post Bupher file')
                }

                const postDraftResponse = await postBupherDraft(
                    bupherInfos.bupherSession,
                    profiles,
                    text,
                    isVideo
                        ? {
                              videoData: {
                                  title: fileResponse.result?.title ?? '',
                                  id: fileResponse.result?.uploadId ?? '',
                                  details: {
                                      location: fileResponse.result?.location ?? '',
                                      transcoded_location: fileResponse.result?.videoDetails?.transcodedLocation ?? '',
                                      file_size: fileResponse.result?.videoDetails?.fileSize ?? 0,
                                      duration: fileResponse.result?.videoDetails?.duration ?? 0,
                                      duration_millis: fileResponse.result?.videoDetails?.durationMillis ?? 0,
                                      width: fileResponse.result?.videoDetails?.width ?? 0,
                                      height: fileResponse.result?.videoDetails?.height ?? 0,
                                  },
                                  thumb_offset: 0,
                                  thumbnails: thumbnailUrl
                                      ? [thumbnailUrl]
                                      : fileResponse.result?.thumbnail
                                      ? [fileResponse.result.thumbnail]
                                      : [],
                              },
                          }
                        : {
                              photoUrl: fileResponse.result?.location,
                              photoSize: {
                                  width: fileResponse.result?.width ?? 0,
                                  height: fileResponse.result?.height ?? 0,
                              },
                          }
                )
                if (!postDraftResponse.success) {
                    console.warn('postDraftResponse', postDraftResponse)
                }

                reply.send({
                    success: true,
                })
            } catch (error) {
                console.error('Bupher channels error:', error)
                reply.code(500).send({
                    success: false,
                    error: 'Internal server error while fetching Bupher channels',
                })
            }
        }
    )
    done()
}
