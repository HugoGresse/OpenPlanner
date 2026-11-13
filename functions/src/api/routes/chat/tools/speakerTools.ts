import { v4 as uuidv4 } from 'uuid'
import { SpeakerDao } from '../../../dao/speakerDao'
import { Speaker } from '../../../../../../src/types'
import { TypeBoxCreateSpeaker } from '../../speakers/createSpeakerPOST'
import { toApiSpeaker } from '../../speakers/getSpeakersGET'
import { TypeBoxUpdateSpeaker } from '../../speakers/updateSpeakerPATCH'
import {
    ChatTool,
    endpointFor,
    expectedMismatch,
    expectedParam,
    fieldsParam,
    IRREVERSIBLE,
    listLimit,
    objectSchema,
    pickSchemaFields,
    projectFields,
    proposed,
    RATIONALE_PARAM,
    rejected,
    snapshot,
    stringArg,
    toJsonSchema,
    ToolContext,
    validateBody,
} from '../toolKit'

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
    // Private, opt-in via fields[].
    'email',
    'phone',
    'note',
] as const
const DEFAULT_SPEAKER_FIELDS = ['id', 'name', 'pronouns', 'jobTitle', 'company', 'customFields'] as const

export const loadSpeaker = async ({ firebaseApp, eventId }: ToolContext, speakerId: string) => {
    const existing = await SpeakerDao.doesSpeakerExist(firebaseApp, eventId, speakerId)
    return existing ? toApiSpeaker({ ...(existing as Speaker), id: speakerId }, true) : null
}

export const checkExpectedSpeakerName = (
    speaker: { id: string; name: string },
    args: Record<string, any>,
    listTool = 'listSpeakers'
) =>
    expectedMismatch({
        arg: 'expectedSpeakerName',
        value: args?.expectedSpeakerName,
        actual: speaker.name,
        entity: 'speaker',
        id: speaker.id,
        listTool,
    })

const speakerIdParams = {
    speakerId: { type: 'string' },
    expectedSpeakerName: expectedParam("speaker's `name`", 'listSpeakers'),
}

const listSpeakersRun = async ({ firebaseApp, eventId }: ToolContext) =>
    (await SpeakerDao.getSpeakers(firebaseApp, eventId)).map((speaker) => toApiSpeaker(speaker, true))

export const SPEAKER_TOOLS: ChatTool[] = [
    {
        type: 'read',
        name: 'listSpeakers',
        capabilities: ['speakers.list'],
        description: `List speakers for the current event. Returns a lean projection by default (${DEFAULT_SPEAKER_FIELDS.join(
            ', '
        )}); pass fields[] to opt into heavier fields like bio / photoUrl or private fields (email, phone, note). Only ask for private fields when the user's request actually needs them.`,
        parameters: objectSchema({
            limit: { type: 'integer', minimum: 1, maximum: 500 },
            fields: fieldsParam(ALLOWED_SPEAKER_FIELDS),
        }),
        run: async (ctx, args) =>
            (await listSpeakersRun(ctx))
                .slice(0, listLimit(args.limit))
                .map((s) => projectFields(s, args.fields, ALLOWED_SPEAKER_FIELDS, DEFAULT_SPEAKER_FIELDS)),
    },
    {
        type: 'read',
        name: 'getSpeaker',
        capabilities: ['speakers.get'],
        description: `Fetch a single speaker by ID. Returns a lean projection by default (${DEFAULT_SPEAKER_FIELDS.join(
            ', '
        )}); pass fields[] to opt into heavier or private fields (e.g. 'bio', 'photoUrl', 'email', 'phone', 'note'). Only ask for private fields when the user's request actually needs them.`,
        parameters: objectSchema({ speakerId: { type: 'string' }, fields: fieldsParam(ALLOWED_SPEAKER_FIELDS) }, [
            'speakerId',
        ]),
        run: async (ctx, args) => {
            const speaker = (await listSpeakersRun(ctx)).find((s) => s.id === args.speakerId)
            if (!speaker) return { error: 'Speaker not found' }
            return projectFields(speaker, args.fields, ALLOWED_SPEAKER_FIELDS, DEFAULT_SPEAKER_FIELDS)
        },
    },
    {
        type: 'proposal',
        name: 'proposePatchSpeaker',
        kind: 'patchSpeaker',
        capabilities: ['speakers.update'],
        description:
            'Propose a partial update to a speaker. Does NOT apply the change: emits a proposal that the user reviews and confirms. Always call listSpeakers first to find the correct speakerId. You MUST also pass expectedSpeakerName matching the speaker name returned by listSpeakers; the server rejects the call if the name does not match the document at speakerId. Private fields (email, phone, note) ARE patchable through this tool: the user sees the proposed value in the diff and explicitly approves it before the change is written.',
        parameters: objectSchema(
            { ...speakerIdParams, patch: toJsonSchema(TypeBoxUpdateSpeaker), rationale: RATIONALE_PARAM },
            ['speakerId', 'expectedSpeakerName', 'patch']
        ),
        build: async (ctx, args) => {
            const speakerId = stringArg(args, 'speakerId')
            if (!speakerId) return rejected('speakerId is required')
            const patch = pickSchemaFields(args?.patch, TypeBoxUpdateSpeaker)
            if (Object.keys(patch).length === 0) return rejected('patch must contain at least one allowed field')
            const invalid = validateBody(TypeBoxUpdateSpeaker, patch)
            if (invalid) return rejected(invalid)
            const speaker = await loadSpeaker(ctx, speakerId)
            if (!speaker) return rejected(`Speaker not found: ${speakerId}`)
            const mismatch = checkExpectedSpeakerName(speaker, args)
            if (mismatch) return rejected(mismatch)
            return proposed('patchSpeaker', args, {
                summary: `Update speaker ${speaker.name || speakerId}`,
                endpoint: endpointFor('speakers.update', { eventId: ctx.eventId, speakerId }, patch),
                target: { id: speakerId, label: speaker.name || speakerId },
                diff: { before: snapshot(speaker, Object.keys(patch)), after: patch },
            })
        },
    },
    {
        type: 'proposal',
        name: 'proposeCreateSpeaker',
        kind: 'createSpeaker',
        capabilities: ['speakers.create'],
        description:
            'Propose creating one speaker (same fields as POST /speakers; the id is generated and returned in the proposal target, use it to link the speaker to a session). name is required. Does NOT apply: emits a proposal for user review.',
        parameters: objectSchema({ speaker: toJsonSchema(TypeBoxCreateSpeaker, ['id']), rationale: RATIONALE_PARAM }, [
            'speaker',
        ]),
        build: async (ctx, args) => {
            const { id: _ignored, ...body } = pickSchemaFields(args?.speaker, TypeBoxCreateSpeaker)
            const invalid = validateBody(TypeBoxCreateSpeaker, body)
            if (invalid) return rejected(invalid)
            if (!String(body.name).trim()) return rejected('name must not be blank')
            const speakerId = uuidv4()
            return proposed('createSpeaker', args, {
                summary: `Create speaker ${body.name}`,
                endpoint: endpointFor('speakers.create', { eventId: ctx.eventId }, { ...body, id: speakerId }),
                target: { id: speakerId, label: body.name },
                diff: { before: {}, after: body },
            })
        },
    },
    {
        type: 'proposal',
        name: 'proposeDeleteSpeaker',
        kind: 'deleteSpeaker',
        capabilities: ['speakers.delete'],
        description:
            'Propose deleting a speaker (irreversible). Does NOT apply: the user must explicitly confirm the deletion. You MUST pass expectedSpeakerName matching the speaker name returned by listSpeakers; the server rejects the call if it does not match the document at speakerId.',
        parameters: objectSchema({ ...speakerIdParams, rationale: RATIONALE_PARAM }, [
            'speakerId',
            'expectedSpeakerName',
        ]),
        build: async (ctx, args) => {
            const speakerId = stringArg(args, 'speakerId')
            if (!speakerId) return rejected('speakerId is required')
            const speaker = await loadSpeaker(ctx, speakerId)
            if (!speaker) return rejected(`Speaker not found: ${speakerId}`)
            const mismatch = checkExpectedSpeakerName(speaker, args)
            if (mismatch) return rejected(mismatch)
            const { email: _email, phone: _phone, note: _note, ...publicFields } = speaker
            return proposed('deleteSpeaker', args, {
                summary: `Delete speaker ${speaker.name || speakerId}${IRREVERSIBLE}`,
                endpoint: endpointFor('speakers.delete', { eventId: ctx.eventId, speakerId }),
                target: { id: speakerId, label: speaker.name || speakerId },
                diff: { before: publicFields, after: null },
            })
        },
    },
]
