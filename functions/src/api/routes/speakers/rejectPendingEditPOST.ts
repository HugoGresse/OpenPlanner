import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { SpeakerPendingEditDao } from '../../dao/speakerPendingEditDao'

const TypeBoxRejectBody = Type.Object(
    {
        reviewerUid: Type.Optional(Type.String({ maxLength: 200 })),
        reviewNote: Type.Optional(Type.String({ maxLength: 2000 })),
    },
    { additionalProperties: false }
)

export type RejectBody = Static<typeof TypeBoxRejectBody>

export type RejectPendingEditPOSTTypes = {
    Params: { eventId: string; requestId: string }
    Querystring: { apiKey?: string }
    Body: RejectBody
    Reply: { success: boolean; error?: string }
}

export const rejectPendingEditPOSTSchema = {
    tags: ['speakers'],
    summary: 'Reject a pending speaker edit request',
    params: {
        type: 'object',
        properties: {
            eventId: { type: 'string' },
            requestId: { type: 'string' },
        },
        required: ['eventId', 'requestId'],
    },
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: { apiKey: { type: 'string' } },
    },
    body: TypeBoxRejectBody,
    response: {
        200: Type.Object({ success: Type.Boolean() }),
        404: Type.Object({ success: Type.Boolean(), error: Type.String() }),
        409: Type.Object({ success: Type.Boolean(), error: Type.String() }),
    },
    security: [{ apiKey: [] }],
}

export const rejectPendingEditRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string; requestId: string }
            Body: RejectBody
        }>,
        reply: FastifyReply
    ) => {
        const { eventId, requestId } = request.params
        const pending = await SpeakerPendingEditDao.get(fastify.firebase, eventId, requestId)
        if (!pending) {
            reply.status(404).send({ success: false, error: 'Request not found' })
            return
        }
        if (pending.status !== 'pending') {
            reply.status(409).send({ success: false, error: `Already ${pending.status}` })
            return
        }

        await SpeakerPendingEditDao.setReviewed(
            fastify.firebase,
            eventId,
            requestId,
            'rejected',
            request.body.reviewerUid || 'unknown',
            request.body.reviewNote
        )

        reply.status(200).send({ success: true })
    }
}
