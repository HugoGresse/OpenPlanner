import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { SessionDao } from '../../dao/sessionDao'
import { dateToString } from '../../other/dateConverter'

const ApiDates = Type.Union([
    Type.Object({
        start: Type.Union([Type.String(), Type.Null()]),
        end: Type.Union([Type.String(), Type.Null()]),
    }),
    Type.Null(),
])

const ApiTeasingPosts = Type.Union([
    Type.Object({
        twitter: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        linkedin: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        facebook: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        instagram: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        bluesky: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
    Type.Null(),
])

export const ApiSessionSchema = Type.Object({
    id: Type.String(),
    conferenceHallId: Type.Union([Type.String(), Type.Null()]),
    title: Type.String(),
    abstract: Type.Union([Type.String(), Type.Null()]),
    dates: ApiDates,
    durationMinutes: Type.Number(),
    speakers: Type.Array(Type.String()),
    trackId: Type.Union([Type.String(), Type.Null()]),
    language: Type.Union([Type.String(), Type.Null()]),
    level: Type.Union([Type.String(), Type.Null()]),
    presentationLink: Type.Union([Type.String(), Type.Null()]),
    videoLink: Type.Union([Type.String(), Type.Null()]),
    imageUrl: Type.Union([Type.String(), Type.Null()]),
    tags: Type.Optional(Type.Array(Type.String())),
    format: Type.Union([Type.String(), Type.Null()]),
    category: Type.Union([Type.String(), Type.Null()]),
    image: Type.Union([Type.String(), Type.Null()]),
    showInFeedback: Type.Boolean(),
    hideTrackTitle: Type.Boolean(),
    teaserVideoUrl: Type.Union([Type.String(), Type.Null()]),
    teaserImageUrl: Type.Union([Type.String(), Type.Null()]),
    teasingHidden: Type.Boolean(),
    teasingPosts: ApiTeasingPosts,
    extendHeight: Type.Optional(Type.Number()),
    extendWidth: Type.Optional(Type.Number()),
})
export type ApiSessionType = Static<typeof ApiSessionSchema>

export type GetSessionsGETTypes = {
    Params: { eventId: string }
    Querystring: {
        apiKey?: string
        trackId?: string
        categoryId?: string
        format?: string
        language?: string
        limit?: number
        offset?: number
    }
    Reply: ApiSessionType[] | string
}

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 500

export const getSessionsGETSchema = {
    tags: ['sessions'],
    summary: 'List sessions',
    description: 'Returns sessions for an event. Strips the private `note` field.',
    params: {
        type: 'object',
        properties: {
            eventId: { type: 'string', description: 'Event ID' },
        },
        required: ['eventId'],
    },
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
            apiKey: { type: 'string', description: 'The API key of the event' },
            trackId: { type: 'string' },
            categoryId: { type: 'string' },
            format: { type: 'string' },
            language: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT },
            offset: { type: 'integer', minimum: 0, default: 0 },
        },
    },
    response: {
        200: Type.Array(ApiSessionSchema),
        400: Type.String(),
    },
    security: [{ apiKey: [] }],
}

export const getSessionsRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string }
            Querystring: {
                trackId?: string
                categoryId?: string
                format?: string
                language?: string
                limit?: number
                offset?: number
            }
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId } = request.params
            const { trackId, categoryId, format, language, limit = DEFAULT_LIMIT, offset = 0 } = request.query

            let sessions = await SessionDao.getSessions(fastify.firebase, eventId)

            if (trackId) sessions = sessions.filter((s) => s.trackId === trackId)
            if (categoryId) sessions = sessions.filter((s) => s.category === categoryId)
            if (format) sessions = sessions.filter((s) => s.format === format)
            if (language) sessions = sessions.filter((s) => s.language === language)

            const page = sessions.slice(offset, offset + limit)

            const result: ApiSessionType[] = page.map((s) => {
                const a = s as any
                const out: ApiSessionType = {
                    id: a.id,
                    conferenceHallId: a.conferenceHallId ?? null,
                    title: a.title ?? '',
                    abstract: a.abstract ?? null,
                    dates: s.dates
                        ? {
                              start: dateToString(s.dates.start),
                              end: dateToString(s.dates.end),
                          }
                        : null,
                    durationMinutes: a.durationMinutes ?? 0,
                    speakers: a.speakers ?? [],
                    trackId: a.trackId ?? null,
                    language: a.language ?? null,
                    level: a.level ?? null,
                    presentationLink: a.presentationLink ?? null,
                    videoLink: a.videoLink ?? null,
                    imageUrl: a.imageUrl ?? null,
                    format: a.format ?? null,
                    category: a.category ?? null,
                    image: a.image ?? null,
                    showInFeedback: a.showInFeedback ?? false,
                    hideTrackTitle: a.hideTrackTitle ?? false,
                    teaserVideoUrl: a.teaserVideoUrl ?? null,
                    teaserImageUrl: a.teaserImageUrl ?? null,
                    teasingHidden: a.teasingHidden ?? false,
                    teasingPosts: a.teasingPosts ?? null,
                }
                if (a.tags !== undefined) out.tags = a.tags
                if (a.extendHeight !== undefined) out.extendHeight = a.extendHeight
                if (a.extendWidth !== undefined) out.extendWidth = a.extendWidth
                return out
            })

            reply.status(200).send(result)
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to list sessions: ${msg}`)
        }
    }
}
