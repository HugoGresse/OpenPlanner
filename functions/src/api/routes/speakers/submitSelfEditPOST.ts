import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { SpeakerDao } from '../../dao/speakerDao'
import { EventDao } from '../../dao/eventDao'
import { SpeakerPendingEditDao } from '../../dao/speakerPendingEditDao'
import { Speaker, SPEAKER_SELF_EDITABLE_FIELDS, KNOWN_SOCIAL_NAMES, KNOWN_SOCIAL_ICON_BY_NAME } from '../../../types'

const MAX_STRING_LENGTH = 10000

const NullableString = Type.Union([Type.String({ maxLength: MAX_STRING_LENGTH }), Type.Null()])
const NullableUri = Type.Union([Type.String({ format: 'uri' }), Type.Null()])

export const TypeBoxSubmitSelfEdit = Type.Object(
    {
        // `name` is required to be a non-empty string when provided. Speakers
        // cannot clear their own name to null/empty via self-edit — the
        // public form pre-validates this. Other text fields accept null
        // (treated as "clear the value").
        name: Type.Optional(Type.String({ minLength: 1, maxLength: MAX_STRING_LENGTH })),
        pronouns: Type.Optional(NullableString),
        jobTitle: Type.Optional(NullableString),
        bio: Type.Optional(NullableString),
        company: Type.Optional(NullableString),
        companyLogoUrl: Type.Optional(NullableUri),
        geolocation: Type.Optional(NullableString),
        photoUrl: Type.Optional(NullableUri),
        socials: Type.Optional(
            Type.Array(
                Type.Object({
                    name: Type.String({ maxLength: MAX_STRING_LENGTH }),
                    icon: Type.Optional(Type.String()),
                    link: Type.String({ format: 'uri' }),
                })
            )
        ),
        customFields: Type.Optional(
            Type.Record(
                Type.String({ maxLength: MAX_STRING_LENGTH }),
                Type.Union([Type.String({ maxLength: MAX_STRING_LENGTH }), Type.Boolean()])
            )
        ),
    },
    { additionalProperties: false }
)

export type SubmitSelfEditType = Static<typeof TypeBoxSubmitSelfEdit>

export type SubmitSelfEditPOSTTypes = {
    Params: { eventId: string; speakerId: string }
    Querystring: { t?: string }
    Body: SubmitSelfEditType
    Reply: { success: boolean; requestId?: string; error?: string }
}

export const submitSelfEditPOSTSchema = {
    tags: ['speakers'],
    summary: 'Public: speaker submits a pending edit via magic-link token',
    description:
        'Creates a pending edit request that must be approved by an admin before being applied to the speaker.',
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
    body: TypeBoxSubmitSelfEdit,
    response: {
        200: Type.Object({ success: Type.Boolean(), requestId: Type.String() }),
        400: Type.Object({ success: Type.Boolean(), error: Type.String() }),
        401: Type.Object({ success: Type.Boolean(), error: Type.String() }),
        404: Type.Object({ success: Type.Boolean(), error: Type.String() }),
    },
}

const SNAPSHOT_FIELDS: (keyof Speaker)[] = [
    'name',
    'pronouns',
    'jobTitle',
    'bio',
    'company',
    'companyLogoUrl',
    'geolocation',
    'photoUrl',
    'socials',
    'customFields',
]

export const submitSelfEditRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string; speakerId: string }
            Body: SubmitSelfEditType
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

        const event = await EventDao.getEvent(fastify.firebase, eventId).catch(() => null)
        if (!event || !event.speakerSelfEdit?.enabled) {
            reply.status(404).send({ success: false, error: 'Feature not enabled' })
            return
        }

        const speakerData = await SpeakerDao.doesSpeakerExist(fastify.firebase, eventId, speakerId)
        if (!speakerData || speakerData === true) {
            reply.status(404).send({ success: false, error: 'Speaker not found' })
            return
        }
        const speaker = speakerData as Speaker

        const configuredFields = event.speakerSelfEdit?.editableFields?.length
            ? event.speakerSelfEdit.editableFields.filter((f) => (SPEAKER_SELF_EDITABLE_FIELDS as string[]).includes(f))
            : (SPEAKER_SELF_EDITABLE_FIELDS as string[])
        const editableSet = new Set<string>(configuredFields)

        const editableCustomFieldIds = new Set(
            (event.speakerCustomFields || []).filter((f) => f.editableBySpeaker).map((f) => f.id)
        )

        const body = request.body
        const filteredPatch: Partial<Speaker> = {}
        const patchRecord = filteredPatch as unknown as Record<string, unknown>
        const bodyRecord = body as unknown as Record<string, unknown>

        for (const field of SPEAKER_SELF_EDITABLE_FIELDS) {
            if (editableSet.has(field) && bodyRecord[field] !== undefined) {
                patchRecord[field] = bodyRecord[field]
            }
        }

        if (body.socials && filteredPatch.socials) {
            // Constrain `name` to a known list and re-derive the icon
            // server-side so attacker-controlled icon strings cannot end
            // up on the public page. Also enforce http(s) URLs only — the
            // schema `format: uri` accepts e.g. `javascript:` which we
            // never want as a social link target.
            const knownSet = new Set(KNOWN_SOCIAL_NAMES)
            filteredPatch.socials = body.socials
                .filter((s) => knownSet.has(s.name))
                .filter((s) => /^https?:\/\//i.test(s.link))
                .map((social) => ({
                    name: social.name,
                    icon: KNOWN_SOCIAL_ICON_BY_NAME[social.name] || social.name.toLowerCase(),
                    link: social.link,
                }))
        }

        if (body.customFields && editableCustomFieldIds.size > 0) {
            const filteredCF: { [k: string]: string | boolean } = {}
            for (const [k, v] of Object.entries(body.customFields)) {
                if (editableCustomFieldIds.has(k)) {
                    filteredCF[k] = v
                }
            }
            if (Object.keys(filteredCF).length > 0) {
                filteredPatch.customFields = filteredCF
            }
        }

        if (Object.keys(filteredPatch).length === 0) {
            reply.status(400).send({ success: false, error: 'No editable fields provided' })
            return
        }

        const baseSnapshot: Partial<Speaker> = {}
        const snapshotRecord = baseSnapshot as unknown as Record<string, unknown>
        const speakerRecord = speaker as unknown as Record<string, unknown>
        for (const k of SNAPSHOT_FIELDS) {
            if (filteredPatch[k] !== undefined) {
                snapshotRecord[k] = speakerRecord[k] ?? null
            }
        }

        const ip = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || request.ip

        // Atomic batch: write the pending edit AND mark the token used in
        // one round-trip. Previously these were two sequential writes; if
        // the second one failed (network blip, function timeout, etc.) the
        // token stayed valid and the speaker could submit duplicates.
        const requestId = await SpeakerPendingEditDao.createAndConsumeToken(fastify.firebase, eventId, {
            speakerId,
            tokenId: ctx.tokenId,
            ip,
            patch: filteredPatch,
            baseSnapshot,
        })

        reply.status(200).send({ success: true, requestId })
    }
}
