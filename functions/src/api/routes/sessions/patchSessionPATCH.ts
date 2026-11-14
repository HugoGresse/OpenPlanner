import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { SessionDao } from '../../dao/sessionDao'
import { Session } from '../../../types'
import { parseSessionDates } from './parseSessionDates'
import { findInvalidReferences } from './validateSessionReferences'
import { MAX_STRING_LENGTH, NullableString, NullableUri } from '../../other/routeSchemas'

const PatchDates = Type.Union([
    Type.Object(
        {
            start: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            end: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        },
        { additionalProperties: false }
    ),
    Type.Null(),
])

const PatchTeasingPosts = Type.Union([
    Type.Object(
        {
            twitter: Type.Optional(NullableString),
            linkedin: Type.Optional(NullableString),
            facebook: Type.Optional(NullableString),
            instagram: Type.Optional(NullableString),
            bluesky: Type.Optional(NullableString),
        },
        { additionalProperties: false }
    ),
    Type.Null(),
])

export const TypeBoxPatchSession = Type.Object(
    {
        title: Type.Optional(Type.String({ maxLength: MAX_STRING_LENGTH })),
        abstract: Type.Optional(NullableString),
        dates: Type.Optional(PatchDates),
        durationMinutes: Type.Optional(Type.Number()),
        speakers: Type.Optional(Type.Array(Type.String())),
        trackId: Type.Optional(NullableString),
        language: Type.Optional(NullableString),
        level: Type.Optional(NullableString),
        presentationLink: Type.Optional(NullableUri),
        videoLink: Type.Optional(NullableUri),
        imageUrl: Type.Optional(NullableUri),
        tags: Type.Optional(Type.Array(Type.String())),
        format: Type.Optional(NullableString),
        category: Type.Optional(NullableString),
        image: Type.Optional(NullableString),
        showInFeedback: Type.Optional(Type.Boolean()),
        hideTrackTitle: Type.Optional(Type.Boolean()),
        note: Type.Optional(NullableString),
        teaserVideoUrl: Type.Optional(NullableUri),
        teaserImageUrl: Type.Optional(NullableUri),
        teasingHidden: Type.Optional(Type.Boolean()),
        teasingPosts: Type.Optional(PatchTeasingPosts),
        extendHeight: Type.Optional(Type.Number()),
        extendWidth: Type.Optional(Type.Number()),
    },
    { additionalProperties: false }
)

export type PatchSessionType = Static<typeof TypeBoxPatchSession>

export type PatchSessionPATCHTypes = {
    Params: { eventId: string; sessionId: string }
    Querystring: { apiKey?: string }
    Body: PatchSessionType
    Reply: { success: boolean } | string
}

export const patchSessionPATCHSchema = {
    tags: ['sessions'],
    summary: 'Partial update a session',
    description:
        'Update one or more fields on a session. Only provided fields are updated; missing fields are preserved. Unknown fields are rejected (400), an explicit null clears a field. trackId, format, category must exist on the event and speakers must be existing speaker ids (400 otherwise).',
    params: {
        type: 'object',
        properties: {
            eventId: { type: 'string', description: 'Event ID' },
            sessionId: { type: 'string', description: 'Session ID' },
        },
        required: ['eventId', 'sessionId'],
    },
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
            apiKey: { type: 'string', description: 'The API key of the event' },
        },
    },
    body: TypeBoxPatchSession,
    response: {
        200: Type.Object({ success: Type.Boolean() }),
        400: Type.String(),
        404: Type.String(),
    },
    security: [{ apiKey: [] }],
}

export const patchSessionRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string; sessionId: string }
            Body: PatchSessionType
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId, sessionId } = request.params
            const { dates, ...rest } = request.body

            const patch: Partial<Session> & { id: string } = {
                id: sessionId,
                ...rest,
            }

            const parsed = parseSessionDates(dates)
            if (parsed.error) {
                reply.status(400).send(parsed.error)
                return
            }
            if (parsed.dates !== undefined) {
                patch.dates = parsed.dates as Session['dates']
            }

            const referenceError = await findInvalidReferences(
                fastify.firebase,
                eventId,
                rest,
                request.authenticatedEvent
            )
            if (referenceError) {
                // A missing session outranks a bad reference; the existence read only happens on this error path.
                const exists = await SessionDao.doesSessionExist(fastify.firebase, eventId, sessionId)
                reply.status(exists ? 400 : 404).send(exists ? referenceError : `Session not found: ${sessionId}`)
                return
            }

            await SessionDao.patchSession(fastify.firebase, eventId, patch)
            reply.status(200).send({ success: true })
        } catch (error: unknown) {
            if (error instanceof Error && error.message === 'Session not found') {
                reply.status(404).send(`Session not found: ${request.params.sessionId}`)
                return
            }
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to update session: ${msg}`)
        }
    }
}
