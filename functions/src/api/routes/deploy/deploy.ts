import { FastifyInstance } from 'fastify'
import { Type, Static } from '@sinclair/typebox'
import { Error400_401_VerifyRequest, Error400_401_VerifyRequestType } from '../../apiKeyPlugin'
interface IQuerystring {
    triggerWebhooks?: boolean
}

const DeployReply = Type.Object({
    success: Type.Boolean(),
    message: Type.String(),
})

type DeployReplyType = Static<typeof DeployReply>

export const deployRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<{ Querystring: IQuerystring; Reply: DeployReplyType | Error400_401_VerifyRequestType }>(
        '/v1/:eventId/deploy',
        {
            schema: {
                tags: ['deploy'],
                summary: 'Trigger a deployment for an event',
                querystring: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        apiKey: {
                            type: 'string',
                            description: 'The API key of the event',
                        },
                        triggerWebhooks: {
                            type: 'boolean',
                            description: 'Whether to trigger webhooks during deployment',
                            default: true,
                        },
                    },
                },
                response: {
                    200: DeployReply,
                    400: Error400_401_VerifyRequest,
                    401: Error400_401_VerifyRequest,
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
            const { eventId } = request.params as { eventId: string }
            const { triggerWebhooks = true } = request.query

            try {
                console.log(`Starting deployment for event ${eventId}`)

                await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulated async work

                if (triggerWebhooks) {
                    console.log('Triggering webhooks for deployment')
                    // Add webhook triggering logic here
                    // You can use the Webhooks interface from types.ts to handle webhook calls
                }

                reply.status(200).send({
                    success: true,
                    message: `Deployment completed successfully${triggerWebhooks ? ' with webhooks' : ''}`,
                })
            } catch (error) {
                console.error('Deployment failed:', error)
                reply.status(400).send({
                    success: false,
                    message: `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                })
            }
        }
    )
    done()
}
