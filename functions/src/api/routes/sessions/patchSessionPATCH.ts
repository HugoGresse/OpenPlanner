import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { SessionDao } from '../../dao/sessionDao'
import { Session } from '../../../types'

const MAX_STRING_LENGTH = 10000
const NullableString = Type.Union([Type.String({ maxLength: MAX_STRING_LENGTH }), Type.Null()])
const NullableUri = Type.Union([Type.String({ format: 'uri' }), Type.Null()])

const PatchDates = Type.Union([
    Type.Object({
        start: Type.Union([Type.String(), Type.Null()]),
        end: Type.Union([Type.String(), Type.Null()]),
    }),
    Type.Null(),
])

const PatchTeasingPosts = Type.Union([
    Type.Object({
        twitter: Type.Optional(NullableString),
        linkedin: Type.Optional(NullableString),
        facebook: Type.Optional(NullableString),
        instagram: Type.Optional(NullableString),
        bluesky: Type.Optional(NullableString),
    }),
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
    description: 'Update one or more fields on a session. Only provided fields are updated; missing fields are preserved.',
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

            if (dates !== undefined) {
                if (dates === null) {
                    patch.dates = null
                } else {
                    patch.dates = {
                        start: dates.start ? new Date(dates.start) : null,
                        end: dates.end ? new Date(dates.end) : null,
                    }
                }
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
