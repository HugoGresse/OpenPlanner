import firebase from 'firebase-admin'
import { EventDao } from '../../dao/eventDao'
import { SessionDao } from '../../dao/sessionDao'
import { SpeakerDao } from '../../dao/speakerDao'
import { SponsorDao } from '../../dao/sponsorDao'
import { FaqDao } from '../../dao/faqDao'

export type ToolDefinition = {
    type: 'function'
    function: {
        name: string
        description: string
        parameters: object
    }
}

// Token-budget guardrails. Heavy fields like bio / abstract are excluded from
// list and getX results by default — the model can opt them in per call via
// the `fields` array. Private fields (email/phone/note for speakers, note for
// sessions) are NEVER returned to the model regardless of `fields`.

const ALLOWED_SPEAKER_FIELDS = [
    'id',
    'name',
    'pronouns',
    'jobTitle',
    'company',
    'companyLogoUrl',
    'bio',
    'photoUrl',
    'geolocation',
    'socials',
    'customFields',
    'conferenceHallId',
] as const
const DEFAULT_SPEAKER_FIELDS = ['id', 'name', 'pronouns', 'jobTitle', 'company', 'customFields'] as const

const ALLOWED_SESSION_FIELDS = [
    'id',
    'title',
    'abstract',
    'dates',
    'durationMinutes',
    'speakers',
    'trackId',
    'format',
    'category',
    'language',
    'level',
    'tags',
    'showInFeedback',
    'hideTrackTitle',
    'teasingHidden',
    'imageUrl',
    'presentationLink',
    'videoLink',
    'teaserVideoUrl',
    'teaserImageUrl',
    'conferenceHallId',
] as const
const DEFAULT_SESSION_FIELDS = [
    'id',
    'title',
    'dates',
    'durationMinutes',
    'speakers',
    'trackId',
    'format',
    'category',
    'language',
    'level',
    'tags',
    'showInFeedback',
] as const

const projectFields = (
    obj: any,
    requestedFields: unknown,
    allowed: readonly string[],
    defaults: readonly string[]
): Record<string, any> => {
    const fields: string[] = Array.isArray(requestedFields)
        ? (requestedFields.filter((f): f is string => typeof f === 'string') as string[])
        : []
    const effective = fields.length > 0 ? fields.filter((f) => allowed.includes(f)) : [...defaults]
    const out: Record<string, any> = {}
    for (const k of effective) {
        if (obj && obj[k] !== undefined) out[k] = obj[k]
    }
    // Always carry the id so the model can correlate / reference items.
    if (obj?.id !== undefined && out.id === undefined) out.id = obj.id
    return out
}

const stripPrivateSpeakerFields = (speaker: any) => {
    const { email, phone, note, ...rest } = speaker
    return rest
}

const stripPrivateSessionFields = (session: any) => {
    const { note, ...rest } = session
    return rest
}

// Sponsor docs may carry an internal management token plus other fields the
// model has no business seeing. Whitelist what we forward.
const sanitizeSponsor = (sponsor: any) => ({
    id: sponsor?.id,
    name: sponsor?.name,
    logoUrl: sponsor?.logoUrl,
    website: sponsor?.website ?? null,
    customFields: sponsor?.customFields,
})

const sanitizeSponsorCategory = (category: any) => ({
    id: category?.id,
    name: category?.name,
    order: category?.order,
    sponsors: Array.isArray(category?.sponsors) ? category.sponsors.map(sanitizeSponsor) : [],
})

// Event docs hold credentials (api keys, transcription password, repo tokens,
// OpenRouter key). Whitelist event fields exposed to the model.
const sanitizeEvent = (event: any) => ({
    id: event?.id,
    name: event?.name,
    dates: event?.dates ?? null,
    timezone: event?.timezone ?? null,
    locationName: event?.locationName ?? null,
    locationUrl: event?.locationUrl ?? null,
    logoUrl: event?.logoUrl ?? null,
    logoUrl2: event?.logoUrl2 ?? null,
    backgroundUrl: event?.backgroundUrl ?? null,
    color: event?.color ?? null,
    colorSecondary: event?.colorSecondary ?? null,
    colorBackground: event?.colorBackground ?? null,
    formats: event?.formats ?? [],
    categories: event?.categories ?? [],
    tracks: event?.tracks ?? [],
    sponsorCustomFields: event?.sponsorCustomFields ?? [],
    speakerCustomFields: event?.speakerCustomFields ?? [],
    scheduleVisible: event?.scheduleVisible ?? false,
    publicEnabled: event?.publicEnabled ?? false,
})

const sanitizeFaqCategory = (category: any) => ({
    id: category?.id,
    name: category?.name,
    order: category?.order,
    items: Array.isArray(category?.items)
        ? category.items.map((item: any) => ({
              id: item?.id,
              question: item?.question,
              answer: item?.answer,
              order: item?.order,
              createdAt: item?.createdAt,
              updatedAt: item?.updatedAt,
          }))
        : [],
})

const fieldsArraySchema = (allowed: readonly string[]) => ({
    type: 'array',
    items: { type: 'string', enum: [...allowed] },
    description:
        'Optional projection. When provided, only the listed fields are returned (subset of the allowed list). Use it to keep payloads small. id is always included.',
})

export const READ_ONLY_TOOLS: ToolDefinition[] = [
    {
        type: 'function',
        function: {
            name: 'listSessions',
            description: `List sessions for the current event. Returns a lean projection by default (${DEFAULT_SESSION_FIELDS.join(
                ', '
            )}) to keep token usage low. Pass the optional fields[] to opt into heavier fields like abstract or imageUrl. Private notes are always stripped.`,
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    trackId: { type: 'string' },
                    categoryId: { type: 'string' },
                    format: { type: 'string' },
                    language: { type: 'string' },
                    limit: { type: 'integer', minimum: 1, maximum: 500 },
                    fields: fieldsArraySchema(ALLOWED_SESSION_FIELDS),
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getSession',
            description: `Fetch a single session by ID. Returns a lean projection by default (${DEFAULT_SESSION_FIELDS.join(
                ', '
            )}); pass fields[] to opt into heavier fields. Private notes are always stripped.`,
            parameters: {
                type: 'object',
                additionalProperties: false,
                required: ['sessionId'],
                properties: {
                    sessionId: { type: 'string' },
                    fields: fieldsArraySchema(ALLOWED_SESSION_FIELDS),
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'listSpeakers',
            description: `List speakers for the current event. Returns a lean projection by default (${DEFAULT_SPEAKER_FIELDS.join(
                ', '
            )}); pass fields[] to opt into heavier fields like bio or photoUrl. Private fields (email, phone, note) are always stripped.`,
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    limit: { type: 'integer', minimum: 1, maximum: 500 },
                    fields: fieldsArraySchema(ALLOWED_SPEAKER_FIELDS),
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getSpeaker',
            description: `Fetch a single speaker by ID. Returns a lean projection by default (${DEFAULT_SPEAKER_FIELDS.join(
                ', '
            )}); pass fields[] to opt into heavier fields. Private fields (email, phone, note) are always stripped.`,
            parameters: {
                type: 'object',
                additionalProperties: false,
                required: ['speakerId'],
                properties: {
                    speakerId: { type: 'string' },
                    fields: fieldsArraySchema(ALLOWED_SPEAKER_FIELDS),
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'listSponsors',
            description:
                'List sponsor categories with their sponsors for the current event. Internal tokens are not included.',
            parameters: { type: 'object', additionalProperties: false, properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getEvent',
            description:
                'Fetch a sanitized view of the event document (name, dates, location, theme, tracks/formats/categories, custom-field schemas).',
            parameters: { type: 'object', additionalProperties: false, properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getFaq',
            description:
                'List the public FAQ (categories + their items) for the current event. Private/non-shared categories are not included.',
            parameters: { type: 'object', additionalProperties: false, properties: {} },
        },
    },
]

export const executeTool = async (
    firebaseApp: firebase.app.App,
    eventId: string,
    name: string,
    args: Record<string, any>
): Promise<unknown> => {
    switch (name) {
        case 'listSessions': {
            let sessions = await SessionDao.getSessions(firebaseApp, eventId)
            if (args.trackId) sessions = sessions.filter((s: any) => s.trackId === args.trackId)
            if (args.categoryId) sessions = sessions.filter((s: any) => s.category === args.categoryId)
            if (args.format) sessions = sessions.filter((s: any) => s.format === args.format)
            if (args.language) sessions = sessions.filter((s: any) => s.language === args.language)
            const limit = typeof args.limit === 'number' ? Math.min(args.limit, 500) : 200
            return sessions
                .slice(0, limit)
                .map(stripPrivateSessionFields)
                .map((s) => projectFields(s, args.fields, ALLOWED_SESSION_FIELDS, DEFAULT_SESSION_FIELDS))
        }
        case 'getSession': {
            const sessions = await SessionDao.getSessions(firebaseApp, eventId)
            const session = sessions.find((s: any) => s.id === args.sessionId)
            if (!session) return { error: 'Session not found' }
            return projectFields(
                stripPrivateSessionFields(session),
                args.fields,
                ALLOWED_SESSION_FIELDS,
                DEFAULT_SESSION_FIELDS
            )
        }
        case 'listSpeakers': {
            const speakers = await SpeakerDao.getSpeakers(firebaseApp, eventId)
            const limit = typeof args.limit === 'number' ? Math.min(args.limit, 500) : 200
            return speakers
                .slice(0, limit)
                .map(stripPrivateSpeakerFields)
                .map((s) => projectFields(s, args.fields, ALLOWED_SPEAKER_FIELDS, DEFAULT_SPEAKER_FIELDS))
        }
        case 'getSpeaker': {
            const speakers = await SpeakerDao.getSpeakers(firebaseApp, eventId)
            const speaker = speakers.find((s: any) => s.id === args.speakerId)
            if (!speaker) return { error: 'Speaker not found' }
            return projectFields(
                stripPrivateSpeakerFields(speaker),
                args.fields,
                ALLOWED_SPEAKER_FIELDS,
                DEFAULT_SPEAKER_FIELDS
            )
        }
        case 'listSponsors': {
            const sponsors = await SponsorDao.getSponsors(firebaseApp, eventId)
            return Array.isArray(sponsors) ? sponsors.map(sanitizeSponsorCategory) : []
        }
        case 'getEvent': {
            const event = await EventDao.getEvent(firebaseApp, eventId)
            return sanitizeEvent(event)
        }
        case 'getFaq': {
            const categories = await FaqDao.getFullFaqs(firebaseApp, eventId)
            return Array.isArray(categories)
                ? categories.filter((c: any) => c?.share === true && c?.private !== true).map(sanitizeFaqCategory)
                : []
        }
        default:
            return { error: `Unknown tool: ${name}` }
    }
}
