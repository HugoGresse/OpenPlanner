import { Type } from '@sinclair/typebox'
import { FastifyInstance } from 'fastify'
import { EventDao } from '../../dao/eventDao'
import { getStorageBucketName } from '../../dao/firebasePlugin'

const GetPdfMetadataReply = Type.Object({
    exists: Type.Boolean(),
    lastModified: Type.Optional(Type.String()),
    size: Type.Optional(Type.Number()),
    url: Type.Optional(Type.String()),
})

export const getPdfMetadataRoute = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.get<{ Params: { eventId: string }; Body: { apiKey: string } }>(
        '/v1/:eventId/event/pdf-metadata',
        {
            schema: {
                tags: ['event'],
                summary: 'Get PDF metadata including last modified date',
                description: 'Get metadata for the event PDF including last modified date and file size',
                params: Type.Object({
                    eventId: Type.String(),
                }),
                response: {
                    200: GetPdfMetadataReply,
                    400: Type.String(),
                    401: Type.String(),
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
            const { eventId } = request.params

            const event = await EventDao.getEvent(fastify.firebase, eventId)

            if (!event.publicEnabled) {
                reply.status(401).send(
                    JSON.stringify({
                        error: 'Event is not public',
                    })
                )
                return
            }

            if (!event.files?.pdf) {
                reply.status(200).send({
                    exists: false,
                })
                return
            }

            try {
                const storageBucket = getStorageBucketName()
                const bucket = fastify.firebase.storage().bucket(storageBucket)
                const file = bucket.file(event.files.pdf)

                const [metadata] = await file.getMetadata()
                const url = `https://storage.googleapis.com/${storageBucket}/${event.files.pdf}`

                reply.status(200).send({
                    exists: true,
                    lastModified: metadata.updated,
                    size: parseInt(metadata.size, 10),
                    url,
                })
            } catch (error) {
                console.error('Error getting PDF metadata:', error)
                reply.status(400).send(
                    JSON.stringify({
                        error: 'Failed to get PDF metadata',
                        details: error instanceof Error ? error.message : 'Unknown error',
                    })
                )
            }
        }
    )
    done()
}
