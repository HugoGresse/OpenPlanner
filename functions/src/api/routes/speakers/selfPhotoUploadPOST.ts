import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { extractMultipartFormData } from '../file/utils/parseMultipartFiles'
import { uploadBufferToStorage } from '../file/utils/uploadBufferToStorage'

export type SelfPhotoUploadPOSTTypes = {
    Params: { eventId: string; speakerId: string }
    Querystring: { t?: string }
    Reply: { success: boolean; publicFileUrl?: string; error?: string }
}

export const selfPhotoUploadPOSTSchema = {
    tags: ['speakers'],
    summary: 'Public: speaker uploads a new photo through magic-link token (stored under pending-edits/)',
    consumes: ['multipart/form-data'],
    params: {
        type: 'object',
        properties: {
            eventId: { type: 'string' },
            speakerId: { type: 'string' },
        },
        required: ['eventId', 'speakerId'],
    },
    querystring: {
        type: 'object',
        properties: { t: { type: 'string' } },
        required: ['t'],
    },
    body: {
        type: 'object',
        properties: {
            anyKey: {
                type: 'object',
                description: 'multipart/form-data — one file (photo) as value',
            },
        },
    },
    response: {
        200: Type.Object({ success: Type.Boolean(), publicFileUrl: Type.String() }),
        400: Type.Object({ success: Type.Boolean(), error: Type.String() }),
        401: Type.Object({ success: Type.Boolean(), error: Type.String() }),
    },
}

export const selfPhotoUploadRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string; speakerId: string }
        }>,
        reply: FastifyReply
    ) => {
        const ctx = request.speakerEditTokenContext
        if (!ctx) {
            reply.status(401).send({ success: false, error: 'Unauthorized' })
            return
        }
        if (ctx.usedAt) {
            reply.status(401).send({ success: false, error: 'Token already used' })
            return
        }

        const { eventId, speakerId } = request.params

        const result = await extractMultipartFormData(request.raw)
        if (!result || !result.uploads || Object.keys(result.uploads).length === 0) {
            reply.status(400).send({ success: false, error: 'Missing file' })
            return
        }

        const firstKey = Object.keys(result.uploads)[0]
        const buffer = result.uploads[firstKey]
        const safeName = `pending-edit-${speakerId}-${Date.now()}`

        const [success, publicFileUrlOrError] = await uploadBufferToStorage(fastify.firebase, buffer, eventId, safeName)

        if (!success) {
            reply.status(400).send({ success: false, error: publicFileUrlOrError })
            return
        }

        reply.status(200).send({ success: true, publicFileUrl: publicFileUrlOrError })
    }
}
