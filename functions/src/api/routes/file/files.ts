import { FastifyInstance } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { extractMultipartFormData } from './utils/parseMultipartFiles'
import { uploadBufferToStorage } from './utils/uploadBufferToStorage'

export const NewFile = Type.Any()

export type NewFileType = Static<typeof NewFile>

const FilesOutputs = Type.Union(
    Type.Rest(
        Type.Tuple([
            Type.Array(
                Type.Object({
                    originalName: Type.String(),
                    publicFileUrl: Type.String(),
                })
            ),
            Type.String(),
        ])
    )
)

export type FilesOutputsType = Static<typeof FilesOutputs>

export const filesRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<{ Body: NewFileType; Reply: FilesOutputsType }>(
        '/v1/:eventId/files',
        {
            schema: {
                tags: ['files'],
                consumes: ['multipart/form-data'],
                summary: 'Upload many files at once and get stored urls',
                body: {
                    type: 'object',
                    properties: {
                        anyKey: {
                            type: 'object',
                            description:
                                "Put any key (will be used as suffix), and add the file as value. It's multipart/form-data",
                        },
                    },
                },
                response: {
                    201: FilesOutputs,
                    400: Type.String(),
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
            const result = await extractMultipartFormData(request.raw)

            if (!result || !result.uploads || Object.keys(result.uploads).length === 0) {
                return reply.status(400).send('Missing file(s)')
            }

            const fileUploads = result.uploads

            const output = []

            for (const file in fileUploads) {
                const buffer = fileUploads[file]

                const [success, publicFileUrlOrError] = await uploadBufferToStorage(
                    fastify.firebase,
                    buffer,
                    eventId,
                    file
                )

                if (!success) {
                    return reply.status(400).send(publicFileUrlOrError)
                }

                output.push({
                    originalName: file,
                    publicFileUrl: publicFileUrlOrError,
                })
            }

            reply.status(201).send(output)
        }
    )
    done()
}
