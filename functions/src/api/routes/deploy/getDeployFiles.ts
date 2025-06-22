import { FastifyInstance } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { getUploadFilePathFromEvent } from './updateWebsiteActions/getFilesNames'
import { EventDao } from '../../dao/eventDao'
import { Error400_401_VerifyRequest, Error400_401_VerifyRequestType } from '../../apiKeyPlugin'

const GetFilesReply = Type.Object({
    success: Type.Boolean(),
    public: Type.String(),
    private: Type.String(),
    openfeedback: Type.String(),
    imageFolder: Type.String(),
    voxxrin: Type.Union([Type.String(), Type.Null()]),
    pdf: Type.Union([Type.String(), Type.Null()]),
})

type GetFilesReplyType = Static<typeof GetFilesReply>

export const deployFilesRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.get<{ Reply: GetFilesReplyType | Error400_401_VerifyRequestType }>(
        '/v1/:eventId/deploy/files',
        {
            schema: {
                tags: ['files', 'deploy'],
                summary: 'Get all file paths for an event',
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
                    200: GetFilesReply,
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

            try {
                const event = await EventDao.getEvent(fastify.firebase, eventId)

                const filePaths = await getUploadFilePathFromEvent(fastify.firebase, event)

                reply.status(200).send({
                    success: true,
                    ...filePaths,
                })
            } catch (error) {
                console.error('Error getting file paths:', error)
                reply.status(400).send({
                    success: false,
                    error: `Error getting file paths: ${error instanceof Error ? error.message : 'Unknown error'}`,
                })
            }
        }
    )

    done()
}
