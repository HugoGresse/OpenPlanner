import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { v4 as uuidv4 } from 'uuid'
import { EventDao } from '../../dao/eventDao'
import { SessionDao } from '../../dao/sessionDao'
import { SpeakerDao } from '../../dao/speakerDao'
import { Session } from '../../../types'
import { replyDaoError } from '../../other/daoErrors'
import { apiKeyQuerystring, apiKeySecurity, eventIdParams, MAX_STRING_LENGTH } from '../../other/routeSchemas'
import { TypeBoxPatchSession } from './patchSessionPATCH'
import { parseSessionDates } from './parseSessionDates'
import { findInvalidSessionReference } from './validateSessionReferences'

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
        'Creates one session. The id is generated when absent (409 when it already exists). trackId, format, category must exist on the event and speakers must be existing speaker ids (400 otherwise). Dates are ISO 8601 and need both bounds. Unknown fields are rejected. Like the web admin, showInFeedback defaults to true.',
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

// Admin defaults for a new session (src/events/page/sessions/EventSessionForm.tsx).
const NEW_SESSION_DEFAULTS: Partial<Session & { tags: string[] }> = {
    speakers: [],
    tags: [],
    dates: null,
    showInFeedback: true,
    hideTrackTitle: false,
    teasingHidden: false,
}

// Returns the message of the first invalid input, or null. Pure apart from the speaker lookup.
const validateCreateBody = async (
    fastify: FastifyInstance,
    eventId: string,
    body: CreateSessionType
): Promise<string | null> => {
    if (!body.title.trim()) return 'title must not be blank'
    const event = await EventDao.getEvent(fastify.firebase, eventId)
    const referenceError = findInvalidSessionReference(event, body)
    if (referenceError) return referenceError
    const missing = await SpeakerDao.findMissingSpeakerIds(fastify.firebase, eventId, body.speakers || [])
    if (missing.length > 0) return `Unknown speaker id(s): ${missing.join(', ')}`
    return null
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
            const inputError = await validateCreateBody(fastify, eventId, request.body)
            if (inputError) {
                reply.status(400).send(inputError)
                return
            }

            const parsed = parseSessionDates(dates)
            if (parsed.error) {
                reply.status(400).send(parsed.error)
                return
            }
            const session: Partial<Session> & { id: string } = { ...NEW_SESSION_DEFAULTS, ...rest, id: sessionId }
            if (parsed.dates) {
                const { start = null, end = null } = parsed.dates
                if (!start !== !end) {
                    reply.status(400).send('dates.start and dates.end must be given together')
                    return
                }
                session.dates = start && end ? { start, end } : null
            }

            await SessionDao.createSession(fastify.firebase, eventId, session)
            reply.status(201).send({ id: sessionId })
        } catch (error: unknown) {
            replyDaoError(reply, error, {
                conflict: `Session already exists: ${sessionId}`,
                failed: 'Failed to create session',
            })
        }
    }
}
