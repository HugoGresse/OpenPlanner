import { FastifyInstance } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { apiKeyPlugin } from '../apiKeyPlugin'
import { SponsorDao } from '../dao/sponsorDao'

export const Sponsor = Type.Object({
    name: Type.String(),
    categoryId: Type.String(),
    categoryName: Type.String(),
    website: Type.Optional(Type.String({ format: 'uri' })),
    logoUrl: Type.Optional(Type.String({ format: 'uri' })),
})

export type SponsorType = Static<typeof Sponsor>

export const sponsorsRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.register(apiKeyPlugin).post<{ Body: SponsorType; Reply: SponsorType }>(
        '/v1/:eventId/sponsors',
        {
            schema: {
                tags: ['sponsors'],
                summary: 'Add one sponsor to an event',
                body: Sponsor,
                response: {
                    201: Sponsor,
                },
                security: [
                    {
                        apiKey: [],
                    },
                ],
            },
        },
        async (request, reply) => {
            const { eventId } = request.params as { eventId: string }

            const sponsorId = await SponsorDao.addSponsor(fastify.firebase, eventId, request.body)

            const sponsor = await SponsorDao.getSponsor(fastify.firebase, eventId, request.body.categoryId, sponsorId)

            reply.status(201).send({
                ...sponsor,
                categoryId: request.body.categoryId,
                categoryName: request.body.categoryName,
            })
        }
    )
    done()
}
