import { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import { getBupherSessionAndUserId, sendErrorResponse } from './utils/bupherUtils'
import { getBupherScheduledPost } from './utils/getBupherScheduledPost'

// Schema definitions
const BupherScheduledPostsResponse = Type.Object({
    success: Type.Boolean(),
    error: Type.Optional(Type.String()),
    posts: Type.Optional(
        Type.Array(
            Type.Object({
                id: Type.String(),
                text: Type.String(),
                scheduledAt: Type.String(),
                channelId: Type.String(),
                channelName: Type.Optional(Type.String()),
                service: Type.Optional(Type.String()),
                status: Type.String(),
                imageUrl: Type.Optional(Type.String()),
            })
        )
    ),
})

export const bupherScheduledPostsRoute = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.get(
        '/v1/:eventId/bupher/scheduled-posts',
        {
            schema: {
                tags: ['bupher'],
                summary: 'Get Bupher scheduled posts',
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
                    200: BupherScheduledPostsResponse,
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

                const postsResponse = await getBupherScheduledPost(
                    bupherInfos.bupherSession,
                    bupherInfos.bupherOrganizationId
                )

                if (!postsResponse.success) {
                    console.error('Failed to fetch posts', postsResponse.error)
                    return sendErrorResponse(reply, 500, 'Failed to fetch posts')
                }

                console.log('postsResponse', postsResponse)
                // todo : finish here

                reply.send({
                    success: true,
                    posts: [],
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
