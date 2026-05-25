import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { SpeakerPendingEditDao } from '../../dao/speakerPendingEditDao'
import { SpeakerDao } from '../../dao/speakerDao'
import { EventDao } from '../../dao/eventDao'
import { Speaker } from '../../../types'
import { sendEmail } from '../../other/sendEmail'
import { renderApprovedEmail } from '../../other/renderPendingEditDecisionEmail'

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

        // Read the speaker BEFORE applying the patch so we keep their pre-
        // approval email/name for the notification — patches never include
        // the email field (not in the editable allowlist) but reading from
        // the source-of-truth row is the safest path.
        const speakerSnap = await SpeakerDao.doesSpeakerExist(fastify.firebase, eventId, pending.speakerId)
        const speakerBefore = speakerSnap && speakerSnap !== true ? (speakerSnap as Speaker) : null

        await SpeakerDao.patchSpeaker(fastify.firebase, eventId, patch)
        await SpeakerPendingEditDao.setReviewed(
            fastify.firebase,
            eventId,
            requestId,
            'approved',
            request.body.reviewerUid || 'unknown'
        )

        // Fire-and-forget approval notification. Best effort: a failure here
        // must not roll back the patch we just applied.
        if (speakerBefore?.email) {
            try {
                const event = await EventDao.getEvent(fastify.firebase, eventId).catch(() => null)
                const email = renderApprovedEmail(
                    speakerBefore.name || 'there',
                    event?.name || 'the event',
                    pending.patch
                )
                await sendEmail(
                    fastify.firebase,
                    { to: speakerBefore.email, subject: email.subject, text: email.text },
                    { eventId, speakerId: pending.speakerId, type: 'speaker-edit-approved', requestId }
                )
            } catch (err) {
                console.error('Failed to queue approval notification', err)
            }
        }

        reply.status(200).send({ success: true })
    }
}
