import { randomUUID } from 'node:crypto'
import { Context, DataOptions } from '../context.js'
import { buildBody } from '../input.js'
import { JsonObject } from '../paths.js'

const BULK_PATH = '/v1/{eventId}/sessions-speakers'

// The bulk endpoint speaks its own vocabulary; accept the session-resource names too.
const SESSION_ALIASES: Record<string, string> = {
    speakers: 'speakerIds',
    format: 'formatId',
    category: 'categoryId',
    track: 'trackId',
}

const SESSION_FIELDS = [
    'id',
    'title',
    'abstract',
    'dateStart',
    'dateEnd',
    'durationMinutes',
    'speakerIds',
    'trackId',
    'trackName',
    'language',
    'level',
    'presentationLink',
    'videoLink',
    'imageUrl',
    'tags',
    'formatId',
    'formatName',
    'categoryId',
    'categoryName',
    'categoryColor',
    'showInFeedback',
    'hideTrackTitle',
    'note',
    'teaserVideoUrl',
    'teaserImageUrl',
    'teasingHidden',
]

const SPEAKER_FIELDS = [
    'id',
    'name',
    'pronouns',
    'jobTitle',
    'bio',
    'company',
    'companyLogoUrl',
    'geolocation',
    'photoUrl',
    'socials',
    'email',
    'phone',
]

export const normalizeSessionBody = (body: JsonObject): JsonObject => {
    const { dates, ...rest } = body
    const normalized: JsonObject = {}
    for (const [key, value] of Object.entries(rest)) normalized[SESSION_ALIASES[key] ?? key] = value
    if (dates && typeof dates === 'object') {
        const { start, end } = dates as { start?: unknown; end?: unknown }
        if (start !== undefined) normalized.dateStart = start
        if (end !== undefined) normalized.dateEnd = end
    }
    return normalized
}

export const assertKnownFields = (body: JsonObject, allowed: string[], kind: string): void => {
    const unknown = Object.keys(body).filter((key) => !allowed.includes(key))
    if (unknown.length > 0) {
        throw new Error(`Unknown ${kind} field(s): ${unknown.join(', ')}. Allowed: ${allowed.join(', ')}`)
    }
}

const createOne = async (ctx: Context, kind: 'sessions' | 'speakers', document: JsonObject) => {
    const withId = { id: randomUUID(), ...document }
    const payload = { speakers: [], sessions: [], [kind]: [withId] }
    const result = await ctx.client.request<object>({ method: 'POST', path: BULK_PATH, body: payload })
    return { ...result, id: withId.id }
}

export const createSession = (ctx: Context, options: DataOptions) => {
    const session = normalizeSessionBody(buildBody(options))
    assertKnownFields(session, SESSION_FIELDS, 'session')
    return createOne(ctx, 'sessions', session)
}

export const createSpeaker = (ctx: Context, options: DataOptions) => {
    const speaker = buildBody(options)
    assertKnownFields(speaker, SPEAKER_FIELDS, 'speaker')
    return createOne(ctx, 'speakers', speaker)
}
