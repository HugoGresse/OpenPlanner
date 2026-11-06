import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { EventDao } from '../../dao/eventDao'
import { Error400_401_VerifyRequest } from '../../apiKeyPlugin'
import { dateToString } from '../../other/dateConverter'
import { Event } from '../../../types'
import {
    CategorySchema,
    FormatSchema,
    NullableString,
    NullableUri,
    SpeakerCustomFieldSchema,
    SponsorCustomFieldSchema,
    TrackSchema,
} from './patchEventPATCH'

const EventDetailsReply = Type.Object({
    id: Type.String(),
    name: Type.String(),
    dates: Type.Object({ start: NullableString, end: NullableString }),
    timezone: NullableString,
    language: NullableString,
    locationName: NullableString,
    locationUrl: NullableUri,
    logoUrl: NullableUri,
    logoUrl2: NullableUri,
    backgroundUrl: NullableUri,
    color: NullableString,
    colorSecondary: NullableString,
    colorBackground: NullableString,
    tracks: Type.Array(TrackSchema),
    formats: Type.Array(FormatSchema),
    categories: Type.Array(CategorySchema),
    sponsorCustomFields: Type.Array(SponsorCustomFieldSchema),
    speakerCustomFields: Type.Array(SpeakerCustomFieldSchema),
    scheduleVisible: Type.Boolean(),
    publicEnabled: Type.Boolean(),
    enableVoxxrin: Type.Boolean(),
    files: Type.Union([Type.Record(Type.String(), Type.Any()), Type.Null()]),
    createdAt: NullableString,
    updatedAt: NullableString,
})
export type EventDetailsReplyType = Static<typeof EventDetailsReply>

export type GetEventDetailsGETTypes = {
    Params: { eventId: string }
    Querystring: { apiKey?: string }
    Reply: EventDetailsReplyType | Static<typeof Error400_401_VerifyRequest>
}

export const getEventDetailsGETSchema = {
    tags: ['event'],
    summary: 'Event settings: tracks, formats, categories, custom fields, dates, branding',
    description:
        'Authenticated read of the event-level fields that PATCH /event can update, plus ids and export file paths. Secrets (API keys, tokens, passwords) are never returned. Arrays are returned in full so they can be edited and sent back to PATCH /event.',
    params: Type.Object({ eventId: Type.String() }),
    querystring: Type.Object({ apiKey: Type.Optional(Type.String({ description: 'The API key of the event' })) }),
    response: { 200: EventDetailsReply, 400: Error400_401_VerifyRequest, 401: Error400_401_VerifyRequest },
    security: [{ apiKey: [] }],
}

const toIso = (value: unknown): string | null => dateToString(value as Parameters<typeof dateToString>[0]) || null

const DEFAULT_FORMAT_DURATION_MINUTES = 20

// Legacy documents may miss fields added later (e.g. custom field privacy):
// default them the way the admin UI does so the reply always validates.
export const toEventDetails = (event: Event): EventDetailsReplyType => ({
    id: event.id,
    name: event.name,
    dates: { start: toIso(event.dates?.start), end: toIso(event.dates?.end) },
    timezone: event.timezone ?? null,
    language: event.language ?? null,
    locationName: event.locationName ?? null,
    locationUrl: event.locationUrl ?? null,
    logoUrl: event.logoUrl ?? null,
    logoUrl2: event.logoUrl2 ?? null,
    backgroundUrl: event.backgroundUrl ?? null,
    color: event.color ?? null,
    colorSecondary: event.colorSecondary ?? null,
    colorBackground: event.colorBackground ?? null,
    tracks: (event.tracks ?? []).map((track) => ({ id: track.id, name: track.name ?? track.id })),
    formats: (event.formats ?? []).map((format) => ({
        id: format.id,
        name: format.name ?? format.id,
        durationMinutes: format.durationMinutes ?? DEFAULT_FORMAT_DURATION_MINUTES,
    })),
    categories: (event.categories ?? []).map((category) => ({
        id: category.id,
        name: category.name ?? category.id,
        color: category.color,
        colorSecondary: category.colorSecondary,
    })),
    sponsorCustomFields: (event.sponsorCustomFields ?? []).map((field) => ({
        id: field.id,
        name: field.name,
        type: field.type ?? 'text',
    })),
    speakerCustomFields: (event.speakerCustomFields ?? []).map((field) => ({
        id: field.id,
        name: field.name,
        type: field.type ?? 'text',
        privacy: field.privacy ?? 'public',
    })),
    scheduleVisible: !!event.scheduleVisible,
    publicEnabled: !!event.publicEnabled,
    enableVoxxrin: !!event.enableVoxxrin,
    files: event.files ?? null,
    createdAt: toIso(event.createdAt),
    updatedAt: toIso(event.updatedAt),
})

export const getEventDetailsRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Params: { eventId: string } }>, reply: FastifyReply) => {
        const event = await EventDao.getEvent(fastify.firebase, request.params.eventId)
        reply.status(200).send(toEventDetails(event))
    }
}
