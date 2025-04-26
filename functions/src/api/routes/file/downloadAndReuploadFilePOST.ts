import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { uploadBufferToStorage } from './utils/uploadBufferToStorage'

export const DownloadReuploadSchema = Type.Object({
    url: Type.String({ format: 'uri' }),
    filename: Type.Optional(Type.String()),
})

export type DownloadReuploadSchemaType = Static<typeof DownloadReuploadSchema>

export type DownloadAndReuploadFilePOSTTypes = {
    Querystring: {}
    Body: DownloadReuploadSchemaType
    Reply: {
        originalName?: string
        publicFileUrl: string
    }
}

export const downloadAndReuploadFilePOSTSchema = {
    tags: ['files'],
    summary: 'Download image from URL and reupload to Firebase storage',
    body: DownloadReuploadSchema,
    response: {
        201: Type.Object({
            originalName: Type.Optional(Type.String()),
            publicFileUrl: Type.String(),
        }),
        400: Type.String(),
        500: Type.String(),
    },
    security: [
        {
            apiKey: [],
        },
    ],
}

export const downloadAndReuploadFileRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{ Querystring: {}; Body: DownloadReuploadSchemaType }>,
        reply: FastifyReply
    ) => {
        const { eventId } = request.params as { eventId: string }
        const { url, filename } = request.body

        try {
            // Download the file using Node 20 fetch API
            const fetchResponse = await fetch(url)

            if (!fetchResponse.ok) {
                return reply
                    .status(400)
                    .send(`Failed to download file: ${fetchResponse.status} ${fetchResponse.statusText}`)
            }

            // Get the file buffer
            const buffer = Buffer.from(await fetchResponse.arrayBuffer())

            // Determine filename if not provided
            const effectiveFilename = filename || new URL(url).pathname.split('/').pop() || 'downloaded-file'

            // Upload to Firebase storage using existing utility
            const [success, publicFileUrlOrError] = await uploadBufferToStorage(
                fastify.firebase,
                buffer,
                eventId,
                effectiveFilename
            )

            if (!success) {
                return reply.status(400).send({
                    error: publicFileUrlOrError,
                })
            }

            // Return success response with optional originalName
            const responseData: { originalName?: string; publicFileUrl: string } = {
                publicFileUrl: publicFileUrlOrError,
            }

            // Only include originalName if we have a filename
            if (filename) {
                responseData.originalName = effectiveFilename
            }

            reply.status(201).send(responseData)
        } catch (error: unknown) {
            fastify.log.error(error)
            return reply
                .status(500)
                .send(`Error processing download request: ${error instanceof Error ? error.message : String(error)}`)
        }
    }
}
