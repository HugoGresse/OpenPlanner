import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { SpeakerDao } from '../../dao/speakerDao'

const ApiSocialSchema = Type.Object({
    name: Type.String(),
    icon: Type.String(),
    link: Type.String(),
})

export const ApiSpeakerSchema = Type.Object({
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
export type ApiSpeakerType = Static<typeof ApiSpeakerSchema>

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 500

export type GetSpeakersGETTypes = {
    Params: { eventId: string }
    Querystring: { apiKey?: string; limit?: number; offset?: number; includePrivate?: boolean }
    Reply: ApiSpeakerType[] | string
}

export const getSpeakersGETSchema = {
    tags: ['speakers'],
    summary: 'List speakers',
    description:
        'Returns speakers for an event. Private fields (note, email, phone) are stripped from the response unless `includePrivate=true` is passed.',
    params: {
        type: 'object',
        properties: {
            eventId: { type: 'string', description: 'Event ID' },
        },
        required: ['eventId'],
    },
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
            apiKey: { type: 'string', description: 'The API key of the event' },
            limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT },
            offset: { type: 'integer', minimum: 0, default: 0 },
            includePrivate: { type: 'boolean', description: 'Include private fields (note, email, phone)' },
        },
    },
    response: {
        200: Type.Array(ApiSpeakerSchema),
        400: Type.String(),
    },
    security: [{ apiKey: [] }],
}

export const getSpeakersRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string }
            Querystring: { limit?: number; offset?: number; includePrivate?: boolean }
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId } = request.params
            const { limit = DEFAULT_LIMIT, offset = 0, includePrivate } = request.query

            const speakers = await SpeakerDao.getSpeakers(fastify.firebase, eventId)
            const page = speakers.slice(offset, offset + limit)

            const result: ApiSpeakerType[] = page.map((s) => {
                const out: ApiSpeakerType = {
                    id: s.id,
                    conferenceHallId: s.conferenceHallId ?? null,
                    name: s.name,
                    pronouns: s.pronouns ?? null,
                    jobTitle: s.jobTitle ?? null,
                    bio: s.bio ?? null,
                    company: s.company ?? null,
                    companyLogoUrl: s.companyLogoUrl ?? null,
                    geolocation: s.geolocation ?? null,
                    photoUrl: s.photoUrl ?? null,
                    socials: s.socials ?? [],
                }
                if (s.customFields !== undefined) out.customFields = s.customFields
                if (includePrivate) {
                    out.email = s.email ?? null
                    out.phone = s.phone ?? null
                    out.note = s.note ?? null
                }
                return out
            })

            reply.status(200).send(result)
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to list speakers: ${msg}`)
        }
    }
}
