import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { v4 as uuidv4 } from 'uuid'
import { SpeakerDao } from '../../dao/speakerDao'
import { Speaker } from '../../../types'
import { replyDaoError } from '../../other/daoErrors'
import { apiKeyQuerystring, apiKeySecurity, eventIdParams, MAX_STRING_LENGTH } from '../../other/routeSchemas'
import { withSocialIcons } from '../../other/socials'
import { TypeBoxUpdateSpeaker } from './updateSpeakerPATCH'

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
        if (!rest.name.trim()) {
            reply.status(400).send('name must not be blank')
            return
        }

        try {
            const speaker: Partial<Speaker> & { id: string } = {
                ...rest,
                id: speakerId,
                socials: withSocialIcons(socials || []),
            }
            await SpeakerDao.createSpeaker(fastify.firebase, eventId, speaker)
            reply.status(201).send({ id: speakerId })
        } catch (error: unknown) {
            replyDaoError(reply, error, {
                conflict: `Speaker already exists: ${speakerId}`,
                failed: 'Failed to create speaker',
            })
        }
    }
}
