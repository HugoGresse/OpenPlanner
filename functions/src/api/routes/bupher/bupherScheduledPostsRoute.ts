import { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import { getBupherSession, makeAuthenticatedBupherRequest, sendErrorResponse } from './bupherUtils'

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
                        channelId: {
                            type: 'string',
                            description: 'Optional channel ID to filter posts',
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
                const { channelId } = request.query as { channelId?: string }

                // Get the Bupher session
                let bupherSession: string
                try {
                    bupherSession = await getBupherSession(fastify.firebase, eventId)
                } catch (error) {
                    return sendErrorResponse(reply, 401, 'No Bupher session found. Please login first.')
                }

                // Fetch scheduled posts from Bupher
                let endpoint = '/api/updates?scheduled=true'
                if (channelId) {
                    endpoint += `&profile_id=${channelId}`
                }

                const postsResponse = await makeAuthenticatedBupherRequest(endpoint, bupherSession)

                if (!postsResponse.ok) {
                    console.error(
                        'Failed to fetch Bupher scheduled posts:',
                        postsResponse.status,
                        postsResponse.statusText
                    )
                    return sendErrorResponse(reply, 500, 'Failed to fetch Bupher scheduled posts')
                }

                const postsData = await postsResponse.json()

                // Get channels to map channel names
                const channelsResponse = await makeAuthenticatedBupherRequest('/api/profiles', bupherSession)
                let channelsMap: Record<string, any> = {}

                if (channelsResponse.ok) {
                    const channelsData = await channelsResponse.json()
                    channelsMap = channelsData.profiles.reduce((acc: Record<string, any>, profile: any) => {
                        acc[profile.id] = {
                            name: profile.name,
                            service: profile.service.name,
                        }
                        return acc
                    }, {})
                }

                // Transform the response to our format
                const posts = postsData.updates.map((post: any) => ({
                    id: post.id,
                    text: post.text,
                    scheduledAt: post.scheduled_at,
                    channelId: post.profile_id,
                    channelName: channelsMap[post.profile_id]?.name || null,
                    service: channelsMap[post.profile_id]?.service || null,
                    status: post.status,
                    imageUrl: post.media?.[0]?.url || null,
                }))

                reply.send({
                    success: true,
                    posts,
                })
            } catch (error) {
                console.error('Bupher scheduled posts error:', error)
                reply.code(500).send({
                    success: false,
                    error: 'Internal server error while fetching Bupher scheduled posts',
                })
            }
        }
    )
    done()
}
