import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { SessionDao } from '../../dao/sessionDao'
import { ApiSessionSchema, ApiSessionType } from './getSessionsGET'
import { dateToString } from '../../other/dateConverter'

export type GetSessionGETTypes = {
    Params: { eventId: string; sessionId: string }
    Querystring: { apiKey?: string }
    Reply: ApiSessionType | string
}

export const getSessionGETSchema = {
    tags: ['sessions'],
    summary: 'Get a single session',
    description: 'Returns a single session by ID. Strips the private `note` field. Returns 404 if not found.',
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
    response: {
        200: ApiSessionSchema,
        404: Type.String(),
        400: Type.String(),
    },
    security: [{ apiKey: [] }],
}

export const getSessionRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string; sessionId: string }
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId, sessionId } = request.params
            const sessionData = await SessionDao.doesSessionExist(fastify.firebase, eventId, sessionId)

            if (!sessionData) {
                reply.status(404).send(`Session not found: ${sessionId}`)
                return
            }

            const a = sessionData as any
            const result: ApiSessionType = {
                id: a.id ?? sessionId,
                conferenceHallId: a.conferenceHallId ?? null,
                title: a.title ?? '',
                abstract: a.abstract ?? null,
                dates: a.dates
                    ? {
                          start: dateToString(a.dates.start),
                          end: dateToString(a.dates.end),
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
            if (a.tags !== undefined) result.tags = a.tags
            if (a.extendHeight !== undefined) result.extendHeight = a.extendHeight
            if (a.extendWidth !== undefined) result.extendWidth = a.extendWidth

            reply.status(200).send(result)
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to get session: ${msg}`)
        }
    }
}
