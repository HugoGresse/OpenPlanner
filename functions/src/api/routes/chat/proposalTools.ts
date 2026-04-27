import firebase from 'firebase-admin'
import { SessionDao } from '../../dao/sessionDao'
import { SpeakerDao } from '../../dao/speakerDao'
import { EventDao } from '../../dao/eventDao'
import { ToolDefinition } from './tools'

// Whitelisted set of fields the model is allowed to propose patches against,
// per entity. Anything outside this set is silently dropped before the
// proposal is shown to the user.
const SPEAKER_PATCH_FIELDS = [
    'name',
    'pronouns',
    'jobTitle',
    'bio',
    'company',
    'companyLogoUrl',
    'geolocation',
    'photoUrl',
    'socials',
    'customFields',
    // Private fields. Patching them through the chat assistant is allowed
    // because every change is gated by the user's explicit approval via the
    // proposal/diff card before the underlying PATCH endpoint is hit.
    'email',
    'phone',
    'note',
] as const

const SESSION_PATCH_FIELDS = [
    'title',
    'abstract',
    'durationMinutes',
    'speakers',
    'trackId',
    'language',
    'level',
    'presentationLink',
    'videoLink',
    'imageUrl',
    'tags',
    'format',
    'category',
    'showInFeedback',
    'hideTrackTitle',
    'teasingHidden',
] as const

const EVENT_PATCH_FIELDS = [
    'name',
    'dates',
    'locationName',
    'locationUrl',
    'logoUrl',
    'logoUrl2',
    'backgroundUrl',
    'color',
    'colorSecondary',
    'colorBackground',
    'tracks',
    'formats',
    'categories',
    'sponsorCustomFields',
    'speakerCustomFields',
    'timezone',
    'scheduleVisible',
    'publicEnabled',
] as const

const pickAllowedFields = <T extends string>(
    input: Record<string, any>,
    allowed: readonly T[]
): Record<string, any> => {
    const out: Record<string, any> = {}
    for (const k of allowed) {
        if (input && Object.prototype.hasOwnProperty.call(input, k)) {
            out[k] = input[k]
        }
    }
    return out
}

// JSON Schema fragments per allowed patch field. These are advertised to
// OpenRouter as the tool parameter schemas so the model knows the expected
// type for each field instead of treating everything as `any`. Aligns with
// the actual PATCH endpoint schemas (see updateSpeakerPATCH / patchSessionPATCH /
// patchEventPATCH). Anything not listed here defaults to "any" via the spread.
const STRING_FIELD = { type: ['string', 'null'] }
const URI_FIELD = { type: ['string', 'null'], format: 'uri' }
const BOOLEAN_FIELD = { type: 'boolean' }
const NUMBER_FIELD = { type: 'number' }
const STRING_ARRAY_FIELD = { type: 'array', items: { type: 'string' } }
const SOCIALS_FIELD = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            name: { type: 'string' },
            icon: { type: 'string' },
            link: { type: 'string', format: 'uri' },
        },
        required: ['name', 'link'],
        additionalProperties: false,
    },
}
const CUSTOM_FIELDS_FIELD = {
    type: 'object',
    additionalProperties: { anyOf: [{ type: 'string' }, { type: 'boolean' }] },
}
const DATE_RANGE_FIELD = {
    type: 'object',
    additionalProperties: false,
    properties: {
        start: { type: ['string', 'null'] },
        end: { type: ['string', 'null'] },
    },
}
const ITEM_LIST_FIELD = {
    type: 'array',
    items: { type: 'object', additionalProperties: true },
}

const SPEAKER_FIELD_SCHEMAS: Record<(typeof SPEAKER_PATCH_FIELDS)[number], object> = {
    name: { type: 'string' },
    pronouns: STRING_FIELD,
    jobTitle: STRING_FIELD,
    bio: STRING_FIELD,
    company: STRING_FIELD,
    companyLogoUrl: URI_FIELD,
    geolocation: STRING_FIELD,
    photoUrl: URI_FIELD,
    socials: SOCIALS_FIELD,
    customFields: CUSTOM_FIELDS_FIELD,
    email: STRING_FIELD,
    phone: STRING_FIELD,
    note: STRING_FIELD,
}

const SESSION_FIELD_SCHEMAS: Record<(typeof SESSION_PATCH_FIELDS)[number], object> = {
    title: { type: 'string' },
    abstract: STRING_FIELD,
    durationMinutes: NUMBER_FIELD,
    speakers: STRING_ARRAY_FIELD,
    trackId: STRING_FIELD,
    language: STRING_FIELD,
    level: STRING_FIELD,
    presentationLink: URI_FIELD,
    videoLink: URI_FIELD,
    imageUrl: URI_FIELD,
    tags: STRING_ARRAY_FIELD,
    format: STRING_FIELD,
    category: STRING_FIELD,
    showInFeedback: BOOLEAN_FIELD,
    hideTrackTitle: BOOLEAN_FIELD,
    teasingHidden: BOOLEAN_FIELD,
}

const EVENT_FIELD_SCHEMAS: Record<(typeof EVENT_PATCH_FIELDS)[number], object> = {
    name: { type: 'string' },
    dates: DATE_RANGE_FIELD,
    locationName: STRING_FIELD,
    locationUrl: STRING_FIELD,
    logoUrl: STRING_FIELD,
    logoUrl2: STRING_FIELD,
    backgroundUrl: STRING_FIELD,
    color: STRING_FIELD,
    colorSecondary: STRING_FIELD,
    colorBackground: STRING_FIELD,
    tracks: ITEM_LIST_FIELD,
    formats: ITEM_LIST_FIELD,
    categories: ITEM_LIST_FIELD,
    sponsorCustomFields: ITEM_LIST_FIELD,
    speakerCustomFields: ITEM_LIST_FIELD,
    timezone: STRING_FIELD,
    scheduleVisible: BOOLEAN_FIELD,
    publicEnabled: BOOLEAN_FIELD,
}

const pick = (obj: any, keys: string[]): Record<string, any> => {
    const out: Record<string, any> = {}
    for (const k of keys) {
        out[k] = obj && obj[k] !== undefined ? obj[k] : null
    }
    return out
}

export type ProposalKind = 'patchSpeaker' | 'patchSession' | 'patchEvent' | 'deleteSpeaker'

export type Proposal = {
    kind: ProposalKind
    summary: string
    /** Endpoint to call (relative to API base) when the user clicks "Apply". */
    endpoint: { method: 'PATCH' | 'DELETE'; path: string; body?: Record<string, any> }
    target: { id: string; label?: string }
    /** Field-level before/after for patches. For deletes, `before` is the full sanitized record. */
    diff: { before: Record<string, any>; after: Record<string, any> | null }
}

export const PROPOSAL_TOOLS: ToolDefinition[] = [
    {
        type: 'function',
        function: {
            name: 'proposePatchSpeaker',
            description:
                'Propose a partial update to a speaker. Does NOT apply the change — emits a proposal that the user reviews and confirms in the UI. Always call listSpeakers first to find the correct speakerId. Private fields (email, phone, note) ARE patchable through this tool: the user sees the proposed value in the diff and explicitly approves it before the change is written.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                required: ['speakerId', 'patch'],
                properties: {
                    speakerId: { type: 'string' },
                    patch: {
                        type: 'object',
                        additionalProperties: false,
                        properties: SPEAKER_FIELD_SCHEMAS,
                    },
                    rationale: { type: 'string', description: 'One short sentence explaining why.' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'proposePatchSession',
            description:
                'Propose a partial update to a session. Does NOT apply the change — emits a proposal for user review.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                required: ['sessionId', 'patch'],
                properties: {
                    sessionId: { type: 'string' },
                    patch: {
                        type: 'object',
                        additionalProperties: false,
                        properties: SESSION_FIELD_SCHEMAS,
                    },
                    rationale: { type: 'string' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'proposePatchEvent',
            description:
                'Propose a partial update to event-level settings (name, dates, location, theme, tracks/formats/categories, custom-field schemas, public flags). Does NOT apply the change — emits a proposal for user review.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                required: ['patch'],
                properties: {
                    patch: {
                        type: 'object',
                        additionalProperties: false,
                        properties: EVENT_FIELD_SCHEMAS,
                    },
                    rationale: { type: 'string' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'proposeDeleteSpeaker',
            description:
                'Propose deleting a speaker. Does NOT apply — the user must explicitly confirm the deletion in the UI.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                required: ['speakerId'],
                properties: {
                    speakerId: { type: 'string' },
                    rationale: { type: 'string' },
                },
            },
        },
    },
]

export const isProposalTool = (name: string): boolean => PROPOSAL_TOOLS.some((t) => t.function.name === name)

export type BuildProposalArgs = {
    firebaseApp: firebase.app.App
    eventId: string
    name: string
    args: Record<string, any>
}

export type BuildProposalResult = { ok: true; proposal: Proposal } | { ok: false; error: string }

export const buildProposal = async ({
    firebaseApp,
    eventId,
    name,
    args,
}: BuildProposalArgs): Promise<BuildProposalResult> => {
    if (name === 'proposePatchSpeaker') {
        const speakerId = String(args?.speakerId ?? '')
        if (!speakerId) return { ok: false, error: 'speakerId is required' }
        const patch = pickAllowedFields(args?.patch ?? {}, SPEAKER_PATCH_FIELDS)
        if (Object.keys(patch).length === 0)
            return { ok: false, error: 'patch must contain at least one allowed field' }
        const existing = await SpeakerDao.doesSpeakerExist(firebaseApp, eventId, speakerId)
        if (!existing || existing === true) return { ok: false, error: `Speaker not found: ${speakerId}` }
        const speaker = { id: speakerId, ...(existing as any) }
        return {
            ok: true,
            proposal: {
                kind: 'patchSpeaker',
                summary: args?.rationale || `Update speaker ${(speaker as any).name ?? speakerId}`,
                endpoint: {
                    method: 'PATCH',
                    path: `/v1/${eventId}/speakers/${speakerId}`,
                    body: patch,
                },
                target: { id: speakerId, label: (speaker as any).name ?? speakerId },
                diff: { before: pick(speaker, Object.keys(patch)), after: patch },
            },
        }
    }
    if (name === 'proposePatchSession') {
        const sessionId = String(args?.sessionId ?? '')
        if (!sessionId) return { ok: false, error: 'sessionId is required' }
        const patch = pickAllowedFields(args?.patch ?? {}, SESSION_PATCH_FIELDS)
        if (Object.keys(patch).length === 0)
            return { ok: false, error: 'patch must contain at least one allowed field' }
        const existing = await SessionDao.doesSessionExist(firebaseApp, eventId, sessionId)
        if (!existing || existing === true) return { ok: false, error: `Session not found: ${sessionId}` }
        const session = { id: sessionId, ...(existing as any) }
        return {
            ok: true,
            proposal: {
                kind: 'patchSession',
                summary: args?.rationale || `Update session ${(session as any).title ?? sessionId}`,
                endpoint: {
                    method: 'PATCH',
                    path: `/v1/${eventId}/sessions/${sessionId}`,
                    body: patch,
                },
                target: { id: sessionId, label: (session as any).title ?? sessionId },
                diff: { before: pick(session, Object.keys(patch)), after: patch },
            },
        }
    }
    if (name === 'proposePatchEvent') {
        const patch = pickAllowedFields(args?.patch ?? {}, EVENT_PATCH_FIELDS)
        if (Object.keys(patch).length === 0)
            return { ok: false, error: 'patch must contain at least one allowed field' }
        const event = await EventDao.getEvent(firebaseApp, eventId)
        return {
            ok: true,
            proposal: {
                kind: 'patchEvent',
                summary: args?.rationale || `Update event ${(event as any).name ?? eventId}`,
                endpoint: {
                    method: 'PATCH',
                    path: `/v1/${eventId}/event`,
                    body: patch,
                },
                target: { id: eventId, label: (event as any).name ?? eventId },
                diff: { before: pick(event, Object.keys(patch)), after: patch },
            },
        }
    }
    if (name === 'proposeDeleteSpeaker') {
        const speakerId = String(args?.speakerId ?? '')
        if (!speakerId) return { ok: false, error: 'speakerId is required' }
        const existing = await SpeakerDao.doesSpeakerExist(firebaseApp, eventId, speakerId)
        if (!existing || existing === true) return { ok: false, error: `Speaker not found: ${speakerId}` }
        const speaker = { id: speakerId, ...(existing as any) }
        const { email, phone, note, ...sanitized } = speaker
        return {
            ok: true,
            proposal: {
                kind: 'deleteSpeaker',
                summary: args?.rationale || `Delete speaker ${speaker.name ?? speakerId}`,
                endpoint: { method: 'DELETE', path: `/v1/${eventId}/speakers/${speakerId}` },
                target: { id: speakerId, label: speaker.name ?? speakerId },
                diff: { before: sanitized, after: null },
            },
        }
    }
    return { ok: false, error: `Unknown proposal tool: ${name}` }
}
