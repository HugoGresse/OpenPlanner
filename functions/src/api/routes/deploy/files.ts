import { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import { getUploadFilePathFromEvent } from './updateWebsiteActions/getFilesNames'
import { EventDao } from '../../dao/eventDao'

const GetFilesReply = Type.Object({
    public: Type.String(),
    private: Type.String(),
    openfeedback: Type.String(),
    voxxrin: Type.Union([Type.String(), Type.Null()]),
})

type GetFilesReplyType = {
    public: string
    private: string
    openfeedback: string
    voxxrin: string | null
}

const ErrorReply = Type.Object({
    success: Type.Boolean(),
    message: Type.String(),
})

type ErrorReplyType = {
    success: boolean
    message: string
}
export const deployFilesRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.get<{ Reply: GetFilesReplyType | ErrorReplyType }>(
        '/v1/:eventId/files/paths',
        {
            schema: {
                tags: ['files'],
                summary: 'Get all file paths for an event',
                response: {
                    200: GetFilesReply,
                    400: ErrorReply,
                    401: ErrorReply,
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

            try {
                const event = await EventDao.getEvent(fastify.firebase, eventId)

                if (!event.files) {
                    reply.status(400).send({
                        success: false,
                        message: 'No files available. Please run "Update website" first.',
                    })
                    return
                }

                const filePaths = await getUploadFilePathFromEvent(fastify.firebase, event)

                reply.status(200).send(filePaths)
            } catch (error) {
                console.error('Error getting file paths:', error)
                reply.status(400).send({
                    success: false,
                    message: `Error getting file paths: ${error instanceof Error ? error.message : 'Unknown error'}`,
                })
            }
        }
    )

    done()
}
