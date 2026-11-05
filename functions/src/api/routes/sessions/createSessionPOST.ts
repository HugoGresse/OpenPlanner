import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { v4 as uuidv4 } from 'uuid'
import { EventDao } from '../../dao/eventDao'
import { SessionDao } from '../../dao/sessionDao'
import { SpeakerDao } from '../../dao/speakerDao'
import { Session } from '../../../types'
import { apiKeyQuerystring, apiKeySecurity, eventIdParams } from '../../other/routeSchemas'
import { TypeBoxPatchSession } from './patchSessionPATCH'
import { parseSessionDates } from './parseSessionDates'
import { findInvalidSessionReference } from './validateSessionReferences'

const MAX_STRING_LENGTH = 10000

export const TypeBoxCreateSession = Type.Object(
    {
        ...TypeBoxPatchSession.properties,
        id: Type.Optional(Type.String({ minLength: 1, maxLength: MAX_STRING_LENGTH })),
        title: Type.String({ minLength: 1, maxLength: MAX_STRING_LENGTH }),
    },
    { additionalProperties: false }
)

export type CreateSessionType = Static<typeof TypeBoxCreateSession>

export type CreateSessionPOSTTypes = {
    Params: { eventId: string }
    Querystring: { apiKey?: string }
    Body: CreateSessionType
    Reply: { id: string } | string
}

export const createSessionPOSTSchema = {
    tags: ['sessions'],
    summary: 'Create a session',
    description:
        'Creates one session. The id is generated when absent (409 when it already exists). trackId, format, category must exist on the event and speakers must be existing speaker ids (400 otherwise). Unknown fields are rejected.',
    params: eventIdParams(),
    querystring: apiKeyQuerystring,
    body: TypeBoxCreateSession,
    response: {
        201: Type.Object({ id: Type.String() }),
        400: Type.String(),
        409: Type.String(),
    },
    security: apiKeySecurity,
}

const findUnknownSpeakers = async (fastify: FastifyInstance, eventId: string, speakerIds: string[]) => {
    const found = await Promise.all(
        speakerIds.map((speakerId) => SpeakerDao.doesSpeakerExist(fastify.firebase, eventId, speakerId))
    )
    return speakerIds.filter((_, index) => !found[index])
}

export const createSessionRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{ Params: { eventId: string }; Body: CreateSessionType }>,
        reply: FastifyReply
    ) => {
        const { eventId } = request.params
        const { id, dates, ...rest } = request.body
        const sessionId = id || uuidv4()

        try {
            const event = await EventDao.getEvent(fastify.firebase, eventId)
            const referenceError = findInvalidSessionReference(event, rest)
            if (referenceError) {
                reply.status(400).send(referenceError)
                return
            }

            const unknownSpeakers = await findUnknownSpeakers(fastify, eventId, rest.speakers || [])
            if (unknownSpeakers.length > 0) {
                reply.status(400).send(`Unknown speaker id(s): ${unknownSpeakers.join(', ')}`)
                return
            }

            const parsed = parseSessionDates(dates)
            if (parsed.error) {
                reply.status(400).send(parsed.error)
                return
            }

            if (await SessionDao.doesSessionExist(fastify.firebase, eventId, sessionId)) {
                reply.status(409).send(`Session already exists: ${sessionId}`)
                return
            }

            const session: Partial<Session> & { id: string } = {
                speakers: [],
                tags: [],
                dates: null,
                ...rest,
                id: sessionId,
            }
            if (parsed.dates) {
                session.dates = { start: parsed.dates.start ?? null, end: parsed.dates.end ?? null }
            }

            await SessionDao.createSession(fastify.firebase, eventId, session)
            reply.status(201).send({ id: sessionId })
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to create session: ${msg}`)
        }
    }
}
