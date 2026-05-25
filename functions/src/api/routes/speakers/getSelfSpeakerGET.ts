import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { SpeakerDao } from '../../dao/speakerDao'
import { EventDao } from '../../dao/eventDao'
import { Speaker, SPEAKER_SELF_EDITABLE_FIELDS } from '../../../types'

const SelfSpeakerResponse = Type.Object({
    speaker: Type.Any(),
    editableFields: Type.Array(Type.String()),
    editableCustomFieldIds: Type.Array(Type.String()),
    eventName: Type.String(),
})

export type GetSelfSpeakerGETTypes = {
    Params: { eventId: string; speakerId: string }
    Querystring: { t?: string }
    Reply: Static<typeof SelfSpeakerResponse> | { success: boolean; error: string }
}

export const getSelfSpeakerGETSchema = {
    tags: ['speakers'],
    summary: 'Public: speaker fetches their own data via magic-link token',
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
    response: {
        200: SelfSpeakerResponse,
        401: Type.Object({ success: Type.Boolean(), error: Type.String() }),
        404: Type.Object({ success: Type.Boolean(), error: Type.String() }),
    },
}

// Top-level public fields a speaker may see about themselves via the
// magic-link endpoint. `customFields` is intentionally NOT in this list —
// it is filtered separately below so that we only expose values for fields
// flagged `editableBySpeaker`, avoiding any leak of private / admin-only
// custom field data.
const PUBLIC_FIELDS: (keyof Speaker)[] = [
    'id',
    'name',
    'pronouns',
    'jobTitle',
    'bio',
    'company',
    'companyLogoUrl',
    'geolocation',
    'photoUrl',
    'socials',
]

export const getSelfSpeakerRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string; speakerId: string }
            Querystring: { t?: string }
        }>,
        reply: FastifyReply
    ) => {
        const { eventId, speakerId } = request.params

        const event = await EventDao.getEvent(fastify.firebase, eventId).catch(() => null)
        if (!event || !event.speakerSelfEdit?.enabled) {
            reply.status(404).send({ success: false, error: 'Not found' })
            return
        }

        const speakerData = await SpeakerDao.doesSpeakerExist(fastify.firebase, eventId, speakerId)
        if (!speakerData || speakerData === true) {
            reply.status(404).send({ success: false, error: 'Speaker not found' })
            return
        }

        const fullSpeaker = speakerData as Speaker
        const publicSpeaker: Partial<Speaker> = { id: speakerId }
        const speakerRecord = fullSpeaker as unknown as Record<string, unknown>
        const publicRecord = publicSpeaker as unknown as Record<string, unknown>
        for (const k of PUBLIC_FIELDS) {
            publicRecord[k] = speakerRecord[k] ?? null
        }

        const editableFields = event.speakerSelfEdit?.editableFields?.length
            ? event.speakerSelfEdit.editableFields.filter((f) => (SPEAKER_SELF_EDITABLE_FIELDS as string[]).includes(f))
            : (SPEAKER_SELF_EDITABLE_FIELDS as string[])

        const editableCustomFieldIds = (event.speakerCustomFields || [])
            .filter((f) => f.editableBySpeaker)
            .map((f) => f.id)

        // Only expose custom field values whose IDs are flagged
        // `editableBySpeaker`. Private/admin-only custom fields stay hidden.
        const speakerCustomFields = (fullSpeaker.customFields || {}) as Record<string, string | boolean>
        const filteredCustomFields: Record<string, string | boolean> = {}
        for (const id of editableCustomFieldIds) {
            if (speakerCustomFields[id] !== undefined) {
                filteredCustomFields[id] = speakerCustomFields[id]
            }
        }
        publicRecord.customFields = filteredCustomFields

        reply.status(200).send({
            speaker: publicSpeaker,
            editableFields,
            editableCustomFieldIds,
            eventName: event.name,
        })
    }
}
