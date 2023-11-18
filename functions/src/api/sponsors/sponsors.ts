import { FastifyInstance } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { apiKeyPlugin } from '../apiKeyPlugin'

export const Sponsor = Type.Object({
    name: Type.String(),
    id: Type.String(),
    website: Type.Optional(Type.String({ format: 'uri' })),
    logoUrl: Type.Optional(Type.String({ format: 'uri' })),
})

export type SponsorType = Static<typeof Sponsor>

export const sponsorsRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.register(apiKeyPlugin).post<{ Body: SponsorType; Reply: SponsorType }>(
        '/v1/:eventId/sponsors',
        {
            schema: {
                body: Sponsor,
                response: {
                    200: Sponsor,
                },
            },
            attachValidation: true,
        },
        async (request, reply) => {
            reply.send({
                id: '1234',
                logoUrl: 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png',
                name: 'Google',
                website: 'https://google.com',
            })
        }
    )
    done()
}
