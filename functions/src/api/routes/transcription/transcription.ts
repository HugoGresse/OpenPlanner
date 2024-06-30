import { FastifyInstance } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { EventDao } from '../../dao/eventDao'
import { getStorageBucketName } from '../../dao/firebasePlugin'

const GetReply = Type.Union([
    Type.Object({
        eventName: Type.String(),
        gladiaAPIKey: Type.String(),
        dataUrl: Type.String(),
    }),
    Type.String(),
])
type GetReplyType = Static<typeof GetReply>

export const transcriptionRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.get<{ Reply: GetReplyType }>(
        '/v1/:eventId/transcription',
        {
            schema: {
                tags: ['transcription'],
                summary: 'Public route to access the Gladia API Key along with some more data',
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

            if (!event.gladiaAPIKey || !event.transcriptionPassword) {
                reply.status(401).send(
                    JSON.stringify({
                        error: 'Missing Gladia API Key or password',
                    })
                )
                return
            }
            if (event.transcriptionPassword !== password) {
                reply.status(401).send(
                    JSON.stringify({
                        error: 'Passwords does not match',
                    })
                )
                return
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
                gladiaAPIKey: event.gladiaAPIKey,
                dataUrl: `https://storage.googleapis.com/${bucket}/${event.files.public}`,
            })
        }
    )
    done()
}
