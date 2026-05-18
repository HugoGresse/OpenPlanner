import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { SpeakerPendingEditDao } from '../../dao/speakerPendingEditDao'
import { SpeakerDao } from '../../dao/speakerDao'
import { Speaker } from '../../../types'

const TypeBoxApproveBody = Type.Object(
    {
        reviewerUid: Type.Optional(Type.String({ maxLength: 200 })),
    },
    { additionalProperties: false }
)

export type ApproveBody = Static<typeof TypeBoxApproveBody>

export type ApprovePendingEditPOSTTypes = {
    Params: { eventId: string; requestId: string }
    Querystring: { apiKey?: string }
    Body: ApproveBody
    Reply: { success: boolean; error?: string }
}

export const approvePendingEditPOSTSchema = {
    tags: ['speakers'],
    summary: 'Approve a pending speaker edit request (applies the patch)',
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
    body: TypeBoxApproveBody,
    response: {
        200: Type.Object({ success: Type.Boolean() }),
        404: Type.Object({ success: Type.Boolean(), error: Type.String() }),
        409: Type.Object({ success: Type.Boolean(), error: Type.String() }),
    },
    security: [{ apiKey: [] }],
}

export const approvePendingEditRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string; requestId: string }
            Body: ApproveBody
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

        const patch: Partial<Speaker> & { id: string } = {
            id: pending.speakerId,
            ...pending.patch,
        }

        await SpeakerDao.patchSpeaker(fastify.firebase, eventId, patch)
        await SpeakerPendingEditDao.setReviewed(
            fastify.firebase,
            eventId,
            requestId,
            'approved',
            request.body.reviewerUid || 'unknown'
        )

        reply.status(200).send({ success: true })
    }
}
