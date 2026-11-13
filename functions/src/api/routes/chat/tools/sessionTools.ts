import { v4 as uuidv4 } from 'uuid'
import { EventDao } from '../../../dao/eventDao'
import { SessionDao } from '../../../dao/sessionDao'
import { SpeakerDao } from '../../../dao/speakerDao'
import { Session } from '../../../../../../src/types'
import {
    CreateSessionType,
    TypeBoxCreateSession,
    toNewSession,
    validateCreateSessionBody,
} from '../../sessions/createSessionPOST'
import { toApiSession } from '../../sessions/getSessionsGET'
import { parseSessionDates } from '../../sessions/parseSessionDates'
import { PatchSessionType, TypeBoxPatchSession } from '../../sessions/patchSessionPATCH'
import { findInvalidSessionReference } from '../../sessions/validateSessionReferences'
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
    // Private, opt-in via fields[].
    'note',
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

// The REST DTO plus the private note, which only the assistant may opt into.
const toToolSession = (session: Session): Record<string, any> => ({ ...toApiSession(session), note: session.note })

const loadSession = async ({ firebaseApp, eventId }: ToolContext, sessionId: string) => {
    const existing = await SessionDao.doesSessionExist(firebaseApp, eventId, sessionId)
    return existing ? toToolSession({ ...(existing as Session), id: sessionId }) : null
}

const checkExpectedTitle = (session: Record<string, any>, args: Record<string, any>) =>
    expectedMismatch({
        arg: 'expectedSessionTitle',
        value: args?.expectedSessionTitle,
        actual: session.title,
        entity: 'session',
        id: session.id,
        listTool: 'listSessions',
    })

// The PATCH route does not check references; the assistant does, so a typo never reaches the review card.
const checkPatchReferences = async ({ firebaseApp, eventId }: ToolContext, patch: PatchSessionType) => {
    const dates = parseSessionDates(patch.dates)
    if (dates.error) return dates.error
    const event = await EventDao.getEvent(firebaseApp, eventId)
    const referenceError = findInvalidSessionReference(event, patch)
    if (referenceError) return referenceError
    const missing = await SpeakerDao.findMissingSpeakerIds(firebaseApp, eventId, patch.speakers || [])
    return missing.length > 0 ? `Unknown speaker id(s): ${missing.join(', ')}` : null
}

const sessionIdParams = {
    sessionId: { type: 'string' },
    expectedSessionTitle: expectedParam("session's `title`", 'listSessions'),
}

export const SESSION_TOOLS: ChatTool[] = [
    {
        type: 'read',
        name: 'listSessions',
        capabilities: ['sessions.list'],
        description: `List sessions for the current event. Returns a lean projection by default (${DEFAULT_SESSION_FIELDS.join(
            ', '
        )}) to keep token usage low. Pass the optional fields[] to opt into heavier fields like abstract / imageUrl, or into the private 'note' field.`,
        parameters: objectSchema({
            trackId: { type: 'string' },
            categoryId: { type: 'string' },
            format: { type: 'string' },
            language: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 500 },
            fields: fieldsParam(ALLOWED_SESSION_FIELDS),
        }),
        run: async ({ firebaseApp, eventId }, args) => {
            let sessions = await SessionDao.getSessions(firebaseApp, eventId)
            if (args.trackId) sessions = sessions.filter((s) => s.trackId === args.trackId)
            if (args.categoryId) sessions = sessions.filter((s) => s.category === args.categoryId)
            if (args.format) sessions = sessions.filter((s) => s.format === args.format)
            if (args.language) sessions = sessions.filter((s) => s.language === args.language)
            return sessions
                .slice(0, listLimit(args.limit))
                .map((s) =>
                    projectFields(toToolSession(s), args.fields, ALLOWED_SESSION_FIELDS, DEFAULT_SESSION_FIELDS)
                )
        },
    },
    {
        type: 'read',
        name: 'getSession',
        capabilities: ['sessions.get'],
        description: `Fetch a single session by ID. Returns a lean projection by default (${DEFAULT_SESSION_FIELDS.join(
            ', '
        )}); pass fields[] to opt into heavier or private fields (e.g. 'abstract', 'note').`,
        parameters: objectSchema({ sessionId: { type: 'string' }, fields: fieldsParam(ALLOWED_SESSION_FIELDS) }, [
            'sessionId',
        ]),
        run: async (ctx, args) => {
            const session = await loadSession(ctx, stringArg(args, 'sessionId'))
            if (!session) return { error: 'Session not found' }
            return projectFields(session, args.fields, ALLOWED_SESSION_FIELDS, DEFAULT_SESSION_FIELDS)
        },
    },
    {
        type: 'proposal',
        name: 'proposePatchSession',
        kind: 'patchSession',
        capabilities: ['sessions.update'],
        description:
            'Propose a partial update to a session (same fields as PATCH /sessions/:id: title, abstract, dates {start,end} ISO 8601, speakers ids, trackId, format, category, tags, note…). Does NOT apply the change: emits a proposal for user review. trackId/format/category/speakers must exist (see getEvent / listSpeakers). You MUST also pass expectedSessionTitle matching the session title returned by listSessions; the server rejects the call if it does not match the document at sessionId.',
        parameters: objectSchema(
            { ...sessionIdParams, patch: toJsonSchema(TypeBoxPatchSession), rationale: RATIONALE_PARAM },
            ['sessionId', 'expectedSessionTitle', 'patch']
        ),
        build: async (ctx, args) => {
            const sessionId = stringArg(args, 'sessionId')
            if (!sessionId) return rejected('sessionId is required')
            const patch = pickSchemaFields(args?.patch, TypeBoxPatchSession)
            if (Object.keys(patch).length === 0) return rejected('patch must contain at least one allowed field')
            const invalid = validateBody(TypeBoxPatchSession, patch)
            if (invalid) return rejected(invalid)
            const session = await loadSession(ctx, sessionId)
            if (!session) return rejected(`Session not found: ${sessionId}`)
            const mismatch = checkExpectedTitle(session, args)
            if (mismatch) return rejected(mismatch)
            const referenceError = await checkPatchReferences(ctx, patch)
            if (referenceError) return rejected(referenceError)
            return proposed('patchSession', args, {
                summary: `Update session ${session.title || sessionId}`,
                endpoint: endpointFor('sessions.update', { eventId: ctx.eventId, sessionId }, patch),
                target: { id: sessionId, label: session.title || sessionId },
                diff: { before: snapshot(session, Object.keys(patch)), after: patch },
            })
        },
    },
    {
        type: 'proposal',
        name: 'proposeCreateSession',
        kind: 'createSession',
        capabilities: ['sessions.create'],
        description:
            'Propose creating one session (same fields as POST /sessions; the id is generated). title is required; trackId, format, category must be ids from getEvent and speakers ids from listSpeakers; dates need both start and end (ISO 8601) or neither. Does NOT apply: emits a proposal for user review.',
        parameters: objectSchema({ session: toJsonSchema(TypeBoxCreateSession, ['id']), rationale: RATIONALE_PARAM }, [
            'session',
        ]),
        build: async (ctx, args) => {
            const { id: _ignored, ...body } = pickSchemaFields(args?.session, TypeBoxCreateSession)
            const invalid = validateBody(TypeBoxCreateSession, body)
            if (invalid) return rejected(invalid)
            const sessionId = uuidv4()
            const typed = body as CreateSessionType
            const inputError = await validateCreateSessionBody(ctx.firebaseApp, ctx.eventId, typed)
            if (inputError) return rejected(inputError)
            const built = toNewSession(typed, sessionId)
            if (built.error !== undefined) return rejected(built.error)
            return proposed('createSession', args, {
                summary: `Create session ${typed.title}`,
                endpoint: endpointFor('sessions.create', { eventId: ctx.eventId }, { ...body, id: sessionId }),
                target: { id: sessionId, label: typed.title },
                diff: { before: {}, after: body },
            })
        },
    },
    {
        type: 'proposal',
        name: 'proposeDeleteSession',
        kind: 'deleteSession',
        capabilities: ['sessions.delete'],
        description:
            'Propose deleting a session (irreversible; its speakers are kept). Does NOT apply: the user must explicitly confirm. You MUST pass expectedSessionTitle matching the title returned by listSessions; the server rejects the call if it does not match the document at sessionId.',
        parameters: objectSchema({ ...sessionIdParams, rationale: RATIONALE_PARAM }, [
            'sessionId',
            'expectedSessionTitle',
        ]),
        build: async (ctx, args) => {
            const sessionId = stringArg(args, 'sessionId')
            if (!sessionId) return rejected('sessionId is required')
            const session = await loadSession(ctx, sessionId)
            if (!session) return rejected(`Session not found: ${sessionId}`)
            const mismatch = checkExpectedTitle(session, args)
            if (mismatch) return rejected(mismatch)
            return proposed('deleteSession', args, {
                summary: `Delete session ${session.title || sessionId}${IRREVERSIBLE}`,
                endpoint: endpointFor('sessions.delete', { eventId: ctx.eventId, sessionId }),
                target: { id: sessionId, label: session.title || sessionId },
                diff: {
                    before: projectFields(session, undefined, ALLOWED_SESSION_FIELDS, DEFAULT_SESSION_FIELDS),
                    after: null,
                },
            })
        },
    },
]
