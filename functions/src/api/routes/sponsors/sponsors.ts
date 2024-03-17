import { FastifyInstance } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { SponsorDao } from '../../dao/sponsorDao'
import { uploadBufferToStorage } from '../file/files'

export const Sponsor = Type.Object({
    name: Type.String(),
    categoryId: Type.String(),
    categoryName: Type.String(),
    website: Type.Optional(Type.String({ format: 'uri' })),
    logoUrl: Type.Optional(Type.String({ format: 'uri' })),
})

export type SponsorType = Static<typeof Sponsor>
interface IQuerystring {
    reUploadAssets?: boolean
}

export const sponsorsRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<{ Querystring: IQuerystring; Body: SponsorType; Reply: SponsorType | string }>(
        '/v1/:eventId/sponsors',
        {
            schema: {
                tags: ['sponsors'],
                summary: 'Add one sponsor to an event',
                body: Sponsor,
                querystring: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        apiKey: {
                            type: 'string',
                            description: 'The API key of the event',
                        },
                        reUploadAssets: {
                            type: 'boolean',
                            description: 'Download the provided logo to be stored in OpenPlanner storage',
                        },
                    },
                },
                response: {
                    201: Sponsor,
                    400: Type.String(),
                },
                security: [
                    {
                        apiKey: [],
                    },
                ],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            const { eventId } = request.params as { eventId: string }
            const { reUploadAssets } = request.query

            let logoUrl = request.body.logoUrl

            if (reUploadAssets === true && logoUrl && logoUrl.startsWith('http') && logoUrl.length > 10) {
                console.log('Downloading sponsor logo')
                const response = await fetch(logoUrl)
                const arrayBuffer = await response.arrayBuffer()
                const fileName = logoUrl.split('/').pop() || Date.now().toString() + '.png'

                console.log("Uploading sponsor's logo", fileName)
                const [reUploadSuccess, publicLogoUrl] = await uploadBufferToStorage(
                    fastify.firebase,
                    Buffer.from(arrayBuffer),
                    eventId,
                    fileName
                )

                if (!reUploadSuccess) {
                    return reply.status(400).send('failed to re-upload logo, ' + logoUrl)
                }

                logoUrl = publicLogoUrl
            }

            const sponsorId = await SponsorDao.addSponsor(fastify.firebase, eventId, {
                ...request.body,
                logoUrl: logoUrl,
            })

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
