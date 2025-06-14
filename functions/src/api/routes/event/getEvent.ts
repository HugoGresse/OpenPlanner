import { FastifyInstance } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { EventDao } from '../../dao/eventDao'
import { getStorageBucketName } from '../../dao/firebasePlugin'

const GetEventReply = Type.Union([
    Type.Object({
        eventName: Type.String(),
        dataUrl: Type.String(),
    }),
    Type.String(),
])
type GetEventReplyType = Static<typeof GetEventReply>

export const getEventRoute = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.get<{ Reply: GetEventReplyType }>(
        '/v1/:eventId/event',
        {
            schema: {
                tags: ['event'],
                summary: 'Public route to access event data',
                response: {
                    200: GetEventReply,
                    400: Type.String(),
                    401: Type.String(),
                },
            },
        },
        async (request, reply) => {
            const { eventId } = request.params as { eventId: string }
            const event = await EventDao.getEvent(fastify.firebase, eventId)

            if (!event.publicEnabled) {
                reply.status(401).send(
                    JSON.stringify({
                        error: 'Event is not public',
                    })
                )
                return
            }
            const bucket = getStorageBucketName()

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
