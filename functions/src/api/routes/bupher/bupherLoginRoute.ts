import { FastifyInstance } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { loginToBupher } from './bupherUtils'

// Schema definitions
const BupherLoginBody = Type.Object({
    email: Type.String(),
    password: Type.String(),
})

type BupherLoginBodyType = Static<typeof BupherLoginBody>

const BupherLoginReply = Type.Object({
    success: Type.Boolean(),
    error: Type.Optional(Type.String()),
    cookies: Type.Optional(Type.String()),
})

type BupherLoginReplyType = Static<typeof BupherLoginReply>

export const bupherLoginRoute = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<{ Body: BupherLoginBodyType; Reply: BupherLoginReplyType }>(
        '/v1/:eventId/bupher/login',
        {
            schema: {
                tags: ['bupher'],
                summary: 'Login to Bupher using credentials',
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
                body: BupherLoginBody,
                response: {
                    200: BupherLoginReply,
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
                const { email, password } = request.body

                const success = await loginToBupher(email, password, fastify.firebase, eventId, reply)

                if (success) {
                    reply.send({
                        success: true,
                    })
                }
                // If not successful, the loginToBupher function will have already sent an error response
            } catch (error) {
                console.error('Bupher login error:', error)
                reply.code(500).send({
                    success: false,
                    error: 'Internal server error during Bupher login',
                })
            }
        }
    )
    done()
}
