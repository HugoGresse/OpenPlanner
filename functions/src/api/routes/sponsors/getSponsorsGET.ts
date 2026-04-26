import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { SponsorDao } from '../../dao/sponsorDao'

const ApiSponsorSchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
    logoUrl: Type.String(),
    website: Type.Union([Type.String(), Type.Null()]),
    jobPostToken: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    customFields: Type.Optional(Type.Record(Type.String(), Type.Union([Type.String(), Type.Boolean()]))),
})

const ApiSponsorCategorySchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
    order: Type.Optional(Type.Number()),
    sponsors: Type.Array(ApiSponsorSchema),
})
type ApiSponsorCategoryType = Static<typeof ApiSponsorCategorySchema>

export type GetSponsorsGETTypes = {
    Params: { eventId: string }
    Querystring: { apiKey?: string }
    Reply: ApiSponsorCategoryType[] | string
}

export const getSponsorsGETSchema = {
    tags: ['sponsors'],
    summary: 'List sponsors',
    description: 'Returns sponsor categories with their sponsors for an event.',
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
        },
    },
    response: {
        200: Type.Array(ApiSponsorCategorySchema),
        400: Type.String(),
    },
    security: [{ apiKey: [] }],
}

export const getSponsorsRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{ Params: { eventId: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId } = request.params
            const categories = await SponsorDao.getSponsors(fastify.firebase, eventId)
            reply.status(200).send(categories as ApiSponsorCategoryType[])
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to list sponsors: ${msg}`)
        }
    }
}
