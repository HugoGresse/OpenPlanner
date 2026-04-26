import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { SpeakerDao } from '../../dao/speakerDao'
import { Speaker } from '../../../types'

const MAX_STRING_LENGTH = 10000

const NullableString = Type.Union([Type.String({ maxLength: MAX_STRING_LENGTH }), Type.Null()])
const NullableUri = Type.Union([Type.String({ format: 'uri' }), Type.Null()])

export const TypeBoxUpdateSpeaker = Type.Object(
    {
        name: Type.Optional(Type.String({ maxLength: MAX_STRING_LENGTH })),
        email: Type.Optional(NullableString),
        phone: Type.Optional(NullableString),
        pronouns: Type.Optional(NullableString),
        jobTitle: Type.Optional(NullableString),
        bio: Type.Optional(NullableString),
        company: Type.Optional(NullableString),
        companyLogoUrl: Type.Optional(NullableUri),
        geolocation: Type.Optional(NullableString),
        photoUrl: Type.Optional(NullableUri),
        note: Type.Optional(NullableString),
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
                // Boolean first so AJV's type coercion does not stringify true/false values.
                Type.Union([Type.Boolean(), Type.String({ maxLength: MAX_STRING_LENGTH })])
            )
        ),
    },
    { additionalProperties: false }
)

export type UpdateSpeakerType = Static<typeof TypeBoxUpdateSpeaker>

export type UpdateSpeakerPATCHTypes = {
    Params: { eventId: string; speakerId: string }
    Querystring: { apiKey?: string }
    Body: UpdateSpeakerType
    Reply: { success: boolean } | string
}

export const updateSpeakerPATCHSchema = {
    tags: ['speakers'],
    summary: 'Update speaker info (partial)',
    description:
        'Update one or more fields on a speaker. Only the fields provided in the body are updated; missing fields are preserved. Supports custom fields defined at the event level.',
    params: {
        type: 'object',
        properties: {
            eventId: { type: 'string', description: 'Event ID' },
            speakerId: { type: 'string', description: 'Speaker ID' },
        },
        required: ['eventId', 'speakerId'],
    },
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
            apiKey: { type: 'string', description: 'The API key of the event' },
        },
    },
    body: TypeBoxUpdateSpeaker,
    response: {
        200: Type.Object({ success: Type.Boolean() }),
        400: Type.String(),
        404: Type.String(),
    },
    security: [{ apiKey: [] }],
}

export const updateSpeakerRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string; speakerId: string }
            Body: UpdateSpeakerType
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId, speakerId } = request.params
            const { socials, ...rest } = request.body
            const patch: Partial<Speaker> & { id: string } = {
                id: speakerId,
                ...rest,
            }
            if (socials) {
                patch.socials = socials.map((social) => ({
                    name: social.name,
                    icon: social.icon || social.name.toLowerCase().trim().replace(' ', '-'),
                    link: social.link,
                }))
            }

            await SpeakerDao.patchSpeaker(fastify.firebase, eventId, patch)
            reply.status(200).send({ success: true })
        } catch (error: unknown) {
            console.error('Error updating speaker:', error)
            if (error instanceof Error && error.message === 'Speaker not found') {
                reply.status(404).send(`Speaker not found: ${request.params.speakerId}`)
                return
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            reply.status(400).send(`Failed to update speaker: ${errorMessage}`)
        }
    }
}
