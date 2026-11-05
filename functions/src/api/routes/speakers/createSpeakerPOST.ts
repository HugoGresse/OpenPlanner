import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { v4 as uuidv4 } from 'uuid'
import { SpeakerDao } from '../../dao/speakerDao'
import { Speaker } from '../../../types'
import { apiKeyQuerystring, apiKeySecurity, eventIdParams } from '../../other/routeSchemas'
import { withSocialIcons } from '../../other/socials'
import { TypeBoxUpdateSpeaker } from './updateSpeakerPATCH'

const MAX_STRING_LENGTH = 10000

export const TypeBoxCreateSpeaker = Type.Object(
    {
        ...TypeBoxUpdateSpeaker.properties,
        id: Type.Optional(Type.String({ minLength: 1, maxLength: MAX_STRING_LENGTH })),
        name: Type.String({ minLength: 1, maxLength: MAX_STRING_LENGTH }),
    },
    { additionalProperties: false }
)

export type CreateSpeakerType = Static<typeof TypeBoxCreateSpeaker>

export type CreateSpeakerPOSTTypes = {
    Params: { eventId: string }
    Querystring: { apiKey?: string }
    Body: CreateSpeakerType
    Reply: { id: string } | string
}

export const createSpeakerPOSTSchema = {
    tags: ['speakers'],
    summary: 'Create a speaker',
    description:
        'Creates one speaker. The id is generated when absent (409 when it already exists). Unknown fields are rejected.',
    params: eventIdParams(),
    querystring: apiKeyQuerystring,
    body: TypeBoxCreateSpeaker,
    response: {
        201: Type.Object({ id: Type.String() }),
        400: Type.String(),
        409: Type.String(),
    },
    security: apiKeySecurity,
}

export const createSpeakerRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{ Params: { eventId: string }; Body: CreateSpeakerType }>,
        reply: FastifyReply
    ) => {
        const { eventId } = request.params
        const { id, socials, ...rest } = request.body
        const speakerId = id || uuidv4()

        try {
            if (await SpeakerDao.doesSpeakerExist(fastify.firebase, eventId, speakerId)) {
                reply.status(409).send(`Speaker already exists: ${speakerId}`)
                return
            }

            const speaker: Partial<Speaker> & { id: string } = {
                ...rest,
                id: speakerId,
                socials: withSocialIcons(socials || []),
            }
            await SpeakerDao.createSpeaker(fastify.firebase, eventId, speaker)
            reply.status(201).send({ id: speakerId })
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to create speaker: ${msg}`)
        }
    }
}
