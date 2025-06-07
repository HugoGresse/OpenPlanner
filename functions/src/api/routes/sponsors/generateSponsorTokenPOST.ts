import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { SponsorDao } from '../../dao/sponsorDao'

export const TypeBoxGenerateSponsorToken = Type.Object({
    sponsorId: Type.String(),
    categoryId: Type.String(),
})

export type GenerateSponsorTokenType = Static<typeof TypeBoxGenerateSponsorToken>

export type GenerateSponsorTokenPOSTTypes = {
    Body: GenerateSponsorTokenType
    Reply: { token: string } | string
}

export const generateSponsorTokenPOSTSchema = {
    tags: ['sponsors'],
    summary: 'Generate a unique token for a sponsor to manage their job posts',
    body: TypeBoxGenerateSponsorToken,
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
            apiKey: {
                type: 'string',
                description: 'The API key of the event',
            },
        },
    },
    response: {
        201: Type.Object({
            token: Type.String(),
        }),
        400: Type.String(),
        404: Type.String(),
    },
    security: [
        {
            apiKey: [],
        },
    ],
}

export const generateSponsorTokenRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Body: GenerateSponsorTokenType }>, reply: FastifyReply) => {
        try {
            const { eventId } = request.params as { eventId: string }
            const { sponsorId, categoryId } = request.body

            try {
                // Check if sponsor exists
                await SponsorDao.getSponsor(fastify.firebase, eventId, categoryId, sponsorId)

                // Generate token for the sponsor
                const token = await SponsorDao.generateTokenForSponsor(fastify.firebase, eventId, categoryId, sponsorId)

                reply.status(201).send({ token })
            } catch (error) {
                reply.status(404).send(`Sponsor not found: ${sponsorId}`)
            }
        } catch (error: unknown) {
            console.error('Error generating sponsor token:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            reply.status(400).send(`Failed to generate sponsor token: ${errorMessage}`)
        }
    }
}
