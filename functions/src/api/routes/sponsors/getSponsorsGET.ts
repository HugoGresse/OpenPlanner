import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { SponsorDao } from '../../dao/sponsorDao'

const ApiSponsorSchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
    logoUrl: Type.String(),
    website: Type.Optional(Type.Union([Type.String(), Type.Null()])),
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
            const result: ApiSponsorCategoryType[] = categories.map((cat) => ({
                id: cat.id,
                name: cat.name,
                ...(cat.order !== undefined ? { order: cat.order } : {}),
                sponsors: (cat.sponsors ?? []).map((s) => {
                    const sponsor: Static<typeof ApiSponsorSchema> = {
                        id: s.id,
                        name: s.name,
                        logoUrl: s.logoUrl ?? '',
                    }
                    if (s.website !== undefined) sponsor.website = s.website ?? null
                    if ((s as any).jobPostToken !== undefined) sponsor.jobPostToken = (s as any).jobPostToken
                    if ((s as any).customFields !== undefined) sponsor.customFields = (s as any).customFields
                    return sponsor
                }),
            }))
            reply.status(200).send(result)
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to list sponsors: ${msg}`)
        }
    }
}
