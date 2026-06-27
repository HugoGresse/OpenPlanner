import { FastifyInstance } from 'fastify'
import Type, { Static } from 'typebox'
import { EventDao } from '../../dao/eventDao'
import { getStorageBucketName } from '../../dao/firebasePlugin'

const GetReply = Type.Union([
    Type.Object({
        eventName: Type.String(),
        dataUrl: Type.String(),
    }),
    Type.String(),
])
type GetReplyType = Static<typeof GetReply>

export const intermissionRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.get<{ Reply: GetReplyType }>(
        '/v1/:eventId/intermission',
        {
            schema: {
                tags: ['intermission'],
                summary: 'Public route for the intermission screen. Password is optional (only enforced if set).',
                response: {
                    200: GetReply,
                    400: Type.String(),
                    401: Type.String(),
                },
                security: [
                    {
                        password: [],
                    },
                ],
            },
        },
        async (request, reply) => {
            const { eventId } = request.params as { eventId: string }
            const password = request.headers['password'] as string

            const event = await EventDao.getEvent(fastify.firebase, eventId)

            const bucket = getStorageBucketName()

            // Password is optional: only enforce when the event defines one
            if (event.intermissionPassword && event.intermissionPassword.length > 0) {
                if (event.intermissionPassword !== password) {
                    reply.status(401).send(
                        JSON.stringify({
                            error: 'Password does not match',
                        })
                    )
                    return
                }
            }

            if (!event.files?.public) {
                reply.status(401).send(
                    JSON.stringify({
                        error: 'Missing public file, did you forgot to "Update website" once?',
                    })
                )
                return
            }

            reply.status(200).send({
                eventName: event.name,
                dataUrl: `https://storage.googleapis.com/${bucket}/${event.files.public}`,
            })
        }
    )

    done()
}
