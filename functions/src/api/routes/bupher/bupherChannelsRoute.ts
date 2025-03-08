import { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import { getBupherSession, makePublishRequest, sendErrorResponse } from './bupherUtils'

// Schema definitions
const BupherChannelResponse = Type.Object({
    success: Type.Boolean(),
    error: Type.Optional(Type.String()),
    channels: Type.Optional(
        Type.Array(
            Type.Object({
                type: Type.String(),
                handle: Type.String(),
                formatted_username: Type.String(),
                avatarUrl: Type.Optional(Type.String()),
            })
        )
    ),
})

export const bupherChannelsRoute = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.get(
        '/v1/:eventId/bupher/channels',
        {
            schema: {
                tags: ['bupher'],
                summary: 'Get Bupher channels list',
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
                    200: BupherChannelResponse,
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
                let bupherSession: string
                try {
                    bupherSession = await getBupherSession(fastify.firebase, eventId)
                } catch (error) {
                    return sendErrorResponse(reply, 401, 'No Bupher session found. Please login first.')
                }

                const channelsResponse = await makePublishRequest(
                    '/rpc/profiles',
                    bupherSession,
                    'POST',
                    '{"args":"{}"}'
                )

                if (!channelsResponse.ok) {
                    console.error('Failed to fetch channels', channelsResponse.status, channelsResponse.statusText)
                    return sendErrorResponse(reply, 500, 'Failed to fetch channels')
                }

                const channels = await channelsResponse.json()

                reply.send({
                    success: true,
                    channels: channels.result.map((channel: any) => ({
                        type: channel.type,
                        handle: channel.handle,
                        formatted_username: channel.formatted_username,
                        avatarUrl: channel.avatarUrl,
                    })),
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
