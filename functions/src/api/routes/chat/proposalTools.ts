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
                'Propose a partial update to a speaker. Does NOT apply the change — emits a proposal that the user reviews and confirms in the UI. Always call listSpeakers first to find the correct speakerId.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                required: ['speakerId', 'patch'],
                properties: {
                    speakerId: { type: 'string' },
                    patch: {
                        type: 'object',
                        additionalProperties: false,
                        properties: SPEAKER_PATCH_FIELDS.reduce<Record<string, any>>((acc, k) => {
                            acc[k] = {}
                            return acc
                        }, {}),
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
                        properties: SESSION_PATCH_FIELDS.reduce<Record<string, any>>((acc, k) => {
                            acc[k] = {}
                            return acc
                        }, {}),
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
                        properties: EVENT_PATCH_FIELDS.reduce<Record<string, any>>((acc, k) => {
                            acc[k] = {}
                            return acc
                        }, {}),
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
        const speakers = await SpeakerDao.getSpeakers(firebaseApp, eventId)
        const speaker = speakers.find((s: any) => s.id === speakerId)
        if (!speaker) return { ok: false, error: `Speaker not found: ${speakerId}` }
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
        const sessions = await SessionDao.getSessions(firebaseApp, eventId)
        const session = sessions.find((s: any) => s.id === sessionId)
        if (!session) return { ok: false, error: `Session not found: ${sessionId}` }
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
        const speakers = await SpeakerDao.getSpeakers(firebaseApp, eventId)
        const speaker = speakers.find((s: any) => s.id === speakerId) as any
        if (!speaker) return { ok: false, error: `Speaker not found: ${speakerId}` }
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
