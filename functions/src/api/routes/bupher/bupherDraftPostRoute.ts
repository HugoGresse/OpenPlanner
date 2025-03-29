import { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import { getBupherSessionAndUserId, sendErrorResponse } from './utils/bupherUtils'
import { postBupherFile } from './utils/postBupherFile'
import { extractMultipartFormData } from '../file/parseMultipartFiles'
import { checkFileTypes } from '../../other/checkFileTypes'

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

                const firstFileKey = Object.keys(fileParsingResult.uploads)[0] as string
                const fileBuffer = fileParsingResult.uploads[firstFileKey] as Buffer
                const fileType = await checkFileTypes(fileBuffer, firstFileKey)
                if (!fileType) {
                    return sendErrorResponse(reply, 400, 'Invalid file type')
                }
                const file = new File([fileBuffer], firstFileKey, { type: fileType.mime })

                const fileResponse = await postBupherFile(
                    bupherInfos.bupherSession,
                    bupherInfos.bupherOrganizationId,
                    file
                )
                console.log('postResponse', fileResponse)

                if (!fileResponse.success) {
                    return sendErrorResponse(reply, 500, 'Failed to post Bupher file')
                }

                // TODO : post draft

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
