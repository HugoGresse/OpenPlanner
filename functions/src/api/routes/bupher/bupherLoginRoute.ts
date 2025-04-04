import { FastifyInstance } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { loginToBupher } from './utils/bupherUtils'
import { EventDao } from '../../dao/eventDao'
import { getBupherOrganization } from './utils/getBupherOrganization'

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

                const bupherSession = await loginToBupher(email, password, fastify.firebase, eventId, reply)

                if (bupherSession) {
                    const organizationResponse = await getBupherOrganization(bupherSession)

                    if (organizationResponse.success) {
                        await EventDao.saveBupherOrganizationId(
                            fastify.firebase,
                            eventId,
                            organizationResponse.result[0].id
                        )

                        reply.send({
                            success: true,
                        })
                    } else {
                        reply.code(400).send({
                            success: false,
                            error: 'Failed to get Bupher organization, ' + organizationResponse.error,
                        })
                    }
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
