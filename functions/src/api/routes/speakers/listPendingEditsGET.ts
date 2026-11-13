import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { SpeakerPendingEditDao } from '../../dao/speakerPendingEditDao'

export type ListPendingEditsGETTypes = {
    Params: { eventId: string }
    Querystring: { apiKey?: string; status?: 'pending' | 'approved' | 'rejected' }
    Reply: { success: boolean; items: unknown[] }
}

export const listPendingEditsGETSchema = {
    tags: ['speakers'],
    summary: 'List pending edit requests for an event',
    params: {
        type: 'object',
        properties: { eventId: { type: 'string' } },
        required: ['eventId'],
    },
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
            apiKey: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
        },
    },
    response: {
        200: Type.Object({
            success: Type.Boolean(),
            items: Type.Array(Type.Any()),
        }),
    },
    security: [{ apiKey: [] }],
}

export const listPendingEditsRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string }
            Querystring: { status?: 'pending' | 'approved' | 'rejected' }
        }>,
        reply: FastifyReply
    ) => {
        const { eventId } = request.params
        const status = request.query.status
        const items = await SpeakerPendingEditDao.list(fastify.firebase, eventId, status)
        reply.status(200).send({ success: true, items })
    }
}
