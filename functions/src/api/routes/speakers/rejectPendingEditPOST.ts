import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { SpeakerPendingEditDao } from '../../dao/speakerPendingEditDao'
import { SpeakerDao } from '../../dao/speakerDao'
import { EventDao } from '../../dao/eventDao'
import { deletePendingPhotoFromUrl } from '../../other/deletePendingPhoto'
import { sendEmail } from '../../other/sendEmail'
import { OPENPLANNER_CONTACT_EMAIL } from '../../other/speakerEmailFooter'
import { renderRejectedEmail } from '../../other/renderPendingEditDecisionEmail'
import { Speaker } from '../../../types'

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

        // Best-effort cleanup of the pending-edit photo file. Only deletes
        // files this flow itself uploaded (matched by the `pending-edit-`
        // marker), so external/admin-managed photos are never touched.
        // Errors are swallowed inside the helper so a storage hiccup does
        // not roll back the reject we already persisted above.
        if (pending.patch?.photoUrl) {
            await deletePendingPhotoFromUrl(fastify.firebase, pending.patch.photoUrl)
        }

        // Fire-and-forget rejection notification so the speaker knows their
        // changes did not land and can decide whether to retry.
        try {
            const speakerSnap = await SpeakerDao.doesSpeakerExist(fastify.firebase, eventId, pending.speakerId)
            const speakerBefore = speakerSnap && speakerSnap !== true ? (speakerSnap as Speaker) : null
            if (speakerBefore?.email) {
                const event = await EventDao.getEvent(fastify.firebase, eventId).catch(() => null)
                const email = renderRejectedEmail(
                    speakerBefore.name || 'there',
                    event?.name || 'the event',
                    pending.patch,
                    request.body.reviewNote
                )
                await sendEmail(
                    fastify.firebase,
                    {
                        to: speakerBefore.email,
                        subject: email.subject,
                        text: email.text,
                        replyTo: OPENPLANNER_CONTACT_EMAIL,
                    },
                    { eventId, speakerId: pending.speakerId, type: 'speaker-edit-rejected', requestId }
                )
            }
        } catch (err) {
            console.error('Failed to queue rejection notification', err)
        }

        reply.status(200).send({ success: true })
    }
}
