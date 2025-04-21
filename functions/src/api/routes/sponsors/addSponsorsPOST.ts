import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { SponsorDao } from '../../dao/sponsorDao'
import { uploadBufferToStorage } from '../file/files'
import { getFileName } from '../../other/getFileName'

export const TypeBoxSponsor = Type.Object({
    name: Type.String(),
    categoryId: Type.String(),
    categoryName: Type.String(),
    website: Type.Optional(Type.String({ format: 'uri' })),
    logoUrl: Type.Optional(Type.String({ format: 'uri' })),
})

export type SponsorType = Static<typeof TypeBoxSponsor>
interface IQuerystring {
    reUploadAssets?: boolean
}

export type AddSponsorPOSTTypes = {
    Querystring: { reUploadAssets?: boolean }
    Body: SponsorType
    Reply: SponsorType | string
}

export const addSponsorPOSTSchema = {
    tags: ['sponsors'],
    summary: 'Add one sponsor to an event',
    body: TypeBoxSponsor,
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
        201: TypeBoxSponsor,
        400: Type.String(),
    },
    security: [
        {
            apiKey: [],
        },
    ],
}

export const addSponsorRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Querystring: IQuerystring; Body: SponsorType }>, reply: FastifyReply) => {
        const { eventId } = request.params as { eventId: string }
        const { reUploadAssets } = request.query

        let logoUrl = request.body.logoUrl

        if (reUploadAssets === true && logoUrl && logoUrl.startsWith('http') && logoUrl.length > 10) {
            console.log('Downloading sponsor logo')
            const response = await fetch(logoUrl)
            const arrayBuffer = await response.arrayBuffer()
            const fileName = getFileName(logoUrl)

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
}
