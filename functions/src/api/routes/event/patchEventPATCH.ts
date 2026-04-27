import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { EventDao } from '../../dao/eventDao'

const NullableString = Type.Union([Type.String(), Type.Null()])
const NullableUri = Type.Union([Type.String({ format: 'uri' }), Type.Null()])

const PatchDates = Type.Object({
    start: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    end: Type.Optional(Type.Union([Type.String(), Type.Null()])),
})

const TrackSchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
})

const FormatSchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
    durationMinutes: Type.Number(),
})

const CategorySchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
    color: Type.Optional(Type.String()),
    colorSecondary: Type.Optional(Type.String()),
})

const SponsorCustomFieldSchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
    type: Type.Union([Type.Literal('boolean'), Type.Literal('text')]),
})

const SpeakerCustomFieldSchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
    type: Type.Union([Type.Literal('boolean'), Type.Literal('text')]),
    privacy: Type.Union([Type.Literal('public'), Type.Literal('private')]),
})

export const TypeBoxPatchEvent = Type.Object(
    {
        name: Type.Optional(Type.String()),
        dates: Type.Optional(PatchDates),
        locationName: Type.Optional(NullableString),
        locationUrl: Type.Optional(NullableUri),
        logoUrl: Type.Optional(NullableUri),
        logoUrl2: Type.Optional(NullableUri),
        backgroundUrl: Type.Optional(NullableUri),
        color: Type.Optional(NullableString),
        colorSecondary: Type.Optional(NullableString),
        colorBackground: Type.Optional(NullableString),
        tracks: Type.Optional(Type.Array(TrackSchema)),
        formats: Type.Optional(Type.Array(FormatSchema)),
        categories: Type.Optional(Type.Array(CategorySchema)),
        sponsorCustomFields: Type.Optional(Type.Array(SponsorCustomFieldSchema)),
        speakerCustomFields: Type.Optional(Type.Array(SpeakerCustomFieldSchema)),
        timezone: Type.Optional(NullableString),
        scheduleVisible: Type.Optional(Type.Boolean()),
        publicEnabled: Type.Optional(Type.Boolean()),
    },
    { additionalProperties: false }
)

export type PatchEventType = Static<typeof TypeBoxPatchEvent>

export type PatchEventPATCHTypes = {
    Params: { eventId: string }
    Querystring: { apiKey?: string }
    Body: PatchEventType
    Reply: { success: boolean } | string
}

export const patchEventPATCHSchema = {
    tags: ['event'],
    summary: 'Partial update event fields',
    description:
        'Update one or more whitelisted event-level fields. Only the provided fields are updated; missing fields are preserved. Unknown fields are rejected.',
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
        },
    },
    body: TypeBoxPatchEvent,
    response: {
        200: Type.Object({ success: Type.Boolean() }),
        400: Type.String(),
        404: Type.String(),
    },
    security: [{ apiKey: [] }],
}

export const patchEventRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string }
            Body: PatchEventType
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId } = request.params
            const { dates, ...rest } = request.body

            const patch: Record<string, unknown> = { ...rest }

            if (dates !== undefined) {
                const datesPatch: { start?: Date | null; end?: Date | null } = {}
                if (dates.start !== undefined) {
                    const start = dates.start ? new Date(dates.start) : null
                    if (start !== null && Number.isNaN(start.getTime())) {
                        reply.status(400).send('Invalid dates.start')
                        return
                    }
                    datesPatch.start = start
                }
                if (dates.end !== undefined) {
                    const end = dates.end ? new Date(dates.end) : null
                    if (end !== null && Number.isNaN(end.getTime())) {
                        reply.status(400).send('Invalid dates.end')
                        return
                    }
                    datesPatch.end = end
                }
                if (Object.keys(datesPatch).length > 0) {
                    patch.dates = datesPatch
                }
            }

            await EventDao.patchEvent(fastify.firebase, eventId, patch)
            reply.status(200).send({ success: true })
        } catch (error: unknown) {
            if (error instanceof Error && error.message === 'Event not found') {
                reply.status(404).send(`Event not found: ${request.params.eventId}`)
                return
            }
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to update event: ${msg}`)
        }
    }
}
