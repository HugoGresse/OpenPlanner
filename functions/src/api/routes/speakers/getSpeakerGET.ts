import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { SpeakerDao } from '../../dao/speakerDao'
import { Speaker } from '../../../types'

const ApiSocialSchema = Type.Object({
    name: Type.String(),
    icon: Type.String(),
    link: Type.String(),
})

const ApiSpeakerResponseSchema = Type.Object({
    id: Type.String(),
    conferenceHallId: Type.Union([Type.String(), Type.Null()]),
    name: Type.String(),
    pronouns: Type.Union([Type.String(), Type.Null()]),
    jobTitle: Type.Union([Type.String(), Type.Null()]),
    bio: Type.Union([Type.String(), Type.Null()]),
    company: Type.Union([Type.String(), Type.Null()]),
    companyLogoUrl: Type.Union([Type.String(), Type.Null()]),
    geolocation: Type.Union([Type.String(), Type.Null()]),
    photoUrl: Type.Union([Type.String(), Type.Null()]),
    socials: Type.Array(ApiSocialSchema),
    customFields: Type.Optional(Type.Record(Type.String(), Type.Union([Type.String(), Type.Boolean()]))),
    email: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    phone: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    note: Type.Optional(Type.Union([Type.String(), Type.Null()])),
})
type ApiSpeakerResponseType = Static<typeof ApiSpeakerResponseSchema>

export type GetSpeakerGETTypes = {
    Params: { eventId: string; speakerId: string }
    Querystring: { apiKey?: string; includePrivate?: boolean }
    Reply: ApiSpeakerResponseType | string
}

export const getSpeakerGETSchema = {
    tags: ['speakers'],
    summary: 'Get a single speaker',
    description:
        'Returns a speaker by ID. Private fields (note, email, phone) are stripped unless `includePrivate=true`.',
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
            includePrivate: { type: 'boolean', description: 'Include private fields (note, email, phone)' },
        },
    },
    response: {
        200: ApiSpeakerResponseSchema,
        404: Type.String(),
        400: Type.String(),
    },
    security: [{ apiKey: [] }],
}

export const getSpeakerRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string; speakerId: string }
            Querystring: { includePrivate?: boolean }
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId, speakerId } = request.params
            const { includePrivate } = request.query

            const speakerData = await SpeakerDao.doesSpeakerExist(fastify.firebase, eventId, speakerId)

            if (!speakerData) {
                reply.status(404).send(`Speaker not found: ${speakerId}`)
                return
            }

            const speaker = speakerData as Speaker

            const result: ApiSpeakerResponseType = {
                id: speaker.id,
                conferenceHallId: speaker.conferenceHallId ?? null,
                name: speaker.name,
                pronouns: speaker.pronouns ?? null,
                jobTitle: speaker.jobTitle ?? null,
                bio: speaker.bio ?? null,
                company: speaker.company ?? null,
                companyLogoUrl: speaker.companyLogoUrl ?? null,
                geolocation: speaker.geolocation ?? null,
                photoUrl: speaker.photoUrl ?? null,
                socials: speaker.socials ?? [],
            }
            if (speaker.customFields !== undefined) result.customFields = speaker.customFields
            if (includePrivate) {
                result.email = speaker.email ?? null
                result.phone = speaker.phone ?? null
                result.note = speaker.note ?? null
            }

            reply.status(200).send(result)
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to get speaker: ${msg}`)
        }
    }
}
