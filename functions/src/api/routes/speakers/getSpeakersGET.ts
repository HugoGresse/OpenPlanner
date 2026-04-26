import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { SpeakerDao } from '../../dao/speakerDao'

const ApiSocialSchema = Type.Object({
    name: Type.String(),
    icon: Type.String(),
    link: Type.String(),
})

export const ApiSpeakerPublicSchema = Type.Object({
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
})
export type ApiSpeakerPublicType = Static<typeof ApiSpeakerPublicSchema>

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 500

export type GetSpeakersGETTypes = {
    Params: { eventId: string }
    Querystring: { apiKey?: string; limit?: number; offset?: number }
    Reply: ApiSpeakerPublicType[] | string
}

export const getSpeakersGETSchema = {
    tags: ['speakers'],
    summary: 'List speakers',
    description:
        'Returns speakers for an event. Private fields (note, email, phone) are stripped from the response.',
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
        },
    },
    response: {
        200: Type.Array(ApiSpeakerPublicSchema),
        400: Type.String(),
    },
    security: [{ apiKey: [] }],
}

export const getSpeakersRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string }
            Querystring: { limit?: number; offset?: number }
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId } = request.params
            const { limit = DEFAULT_LIMIT, offset = 0 } = request.query

            const speakers = await SpeakerDao.getSpeakers(fastify.firebase, eventId)
            const page = speakers.slice(offset, offset + limit)

            const result: ApiSpeakerPublicType[] = page.map(({ note, email, phone, ...rest }) => rest as ApiSpeakerPublicType)

            reply.status(200).send(result)
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to list speakers: ${msg}`)
        }
    }
}
