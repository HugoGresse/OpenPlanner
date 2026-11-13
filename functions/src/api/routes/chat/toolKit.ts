import firebase from 'firebase-admin'
import { Static, TSchema } from 'typebox'
import { FastifySchemaValidationError } from 'fastify/types/schema'
import { DateTime } from 'luxon'
import { Proposal, ProposalKind } from '../../../../../src/events/page/chat/proposalKinds'
import { MAX_STRING_LENGTH } from '../../other/routeSchemas'
import { strictBodyValidatorCompiler } from '../../other/strictValidator'
import { truncate } from '../../other/truncate'
import { AI_ACTION_ID_MAX, AI_ACTION_LABEL_MAX, AI_ACTION_SUMMARY_MAX } from './aiActionsPOST'
import { CapabilityId, getCapability, RouteRef } from './capabilities'

export type { Proposal }

export type ToolDefinition = {
    type: 'function'
    function: { name: string; description: string; parameters: object }
}

export type ToolContext = { firebaseApp: firebase.app.App; eventId: string }
export type ToolArgs = Record<string, any>

// What a proposal tool builds; the registry (tools.ts) stamps the tool's kind on it.
export type ProposalDraft = Omit<Proposal, 'kind'>
export type DraftResult = { ok: true; draft: ProposalDraft } | { ok: false; error: string }
export type BuildProposalResult = { ok: true; proposal: Proposal } | { ok: false; error: string }

type ToolBase = { name: string; description: string; parameters: object }
export type ReadTool = ToolBase & {
    type: 'read'
    // The capabilities (see capabilities/) this tool gives the assistant.
    capabilities: CapabilityId[]
    run: (ctx: ToolContext, args: ToolArgs) => Promise<unknown>
}
export type ProposalTool = ToolBase & {
    type: 'proposal'
    kind: ProposalKind
    // The write capability whose route every proposal of this tool calls.
    capabilities: [CapabilityId]
    build: (ctx: ToolContext, args: ToolArgs) => Promise<DraftResult>
}
export type ChatTool = ReadTool | ProposalTool

export const toDefinition = ({ name, description, parameters }: ChatTool): ToolDefinition => ({
    type: 'function',
    function: { name, description, parameters },
})

export const objectSchema = (properties: Record<string, object>, required: string[] = []) => ({
    type: 'object',
    additionalProperties: false,
    ...(required.length > 0 ? { required } : {}),
    properties,
})

// Route schemas carry noise for the model: the generic length cap, and nullable fields spelled as anyOf.
const compactSchema = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(compactSchema)
    if (!node || typeof node !== 'object') return node
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(node)) {
        if (key === 'maxLength' && typeof value === 'number' && value >= MAX_STRING_LENGTH) continue
        out[key] = compactSchema(value)
    }
    const anyOf = out.anyOf as Array<Record<string, unknown>> | undefined
    if (anyOf?.length === 2 && anyOf[1]?.type === 'null' && typeof anyOf[0]?.type === 'string') {
        const { anyOf: _anyOf, ...rest } = out
        return { ...rest, ...anyOf[0], type: [anyOf[0].type, 'null'] }
    }
    return out
}

// TypeBox schemas are JSON Schema plus symbol-keyed metadata; a JSON round trip keeps the plain schema the
// model sees. `omit` drops properties the server fills itself (e.g. generated ids).
export const toJsonSchema = (schema: TSchema, omit: string[] = []): Record<string, any> => {
    const json = compactSchema(JSON.parse(JSON.stringify(schema))) as Record<string, any>
    for (const key of omit) delete json.properties?.[key]
    if (Array.isArray(json.required)) {
        json.required = json.required.filter((key: string) => !omit.includes(key))
        if (json.required.length === 0) delete json.required
    }
    return json
}

type Validate = ((value: unknown) => boolean) & { errors?: FastifySchemaValidationError[] | null }
const validators = new WeakMap<TSchema, Validate>()

const formatValidationError = (error: FastifySchemaValidationError): string =>
    `${error.instancePath || 'body'} ${error.message ?? 'is invalid'}`

const compile = (schema: TSchema): Validate => {
    let validate = validators.get(schema)
    if (!validate) {
        validate = strictBodyValidatorCompiler({ schema, httpPart: 'body', method: 'POST', url: '/' }) as Validate
        validators.set(schema, validate)
    }
    return validate
}

export type Parsed<T> = { value: T; error?: undefined } | { error: string }

// Validates the model's object against a route body schema with the compiler the write routes use: an unknown
// (e.g. misspelled) field is an error the model can fix, never silently dropped. `omit` removes server-owned
// keys first; `nonEmpty` is for patches.
export const parseBody = <T extends TSchema>(
    schema: T,
    input: unknown,
    { omit = [], nonEmpty = false }: { omit?: string[]; nonEmpty?: boolean } = {}
): Parsed<Static<T>> => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Expected a JSON object' }
    const body = Object.fromEntries(Object.entries(input).filter(([key]) => !omit.includes(key)))
    const allowed = Object.keys((schema as { properties?: object }).properties ?? {}).filter((k) => !omit.includes(k))
    const unknown = Object.keys(body).filter((key) => !allowed.includes(key))
    if (unknown.length > 0) {
        return { error: `Unknown field(s) ${unknown.map((k) => `"${k}"`).join(', ')}. Allowed: ${allowed.join(', ')}` }
    }
    if (nonEmpty && Object.keys(body).length === 0) return { error: 'patch must contain at least one field' }
    const validate = compile(schema)
    if (validate(body)) return { value: body as Static<T> }
    return { error: `Invalid body: ${(validate.errors ?? []).map(formatValidationError).join('; ')}` }
}

const ISO_WITH_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/

// Date strings must parse and carry their UTC offset: a bare local time would be read in the server zone.
export const checkDateBounds = (dates: unknown, field = 'dates'): string | null => {
    if (!dates || typeof dates !== 'object') return null
    for (const [bound, value] of Object.entries(dates)) {
        if (typeof value !== 'string' || value === '') continue
        if (!DateTime.fromISO(value, { setZone: true }).isValid || !ISO_WITH_OFFSET.test(value)) {
            return `${field}.${bound} must be ISO 8601 with a UTC offset (e.g. 2026-06-12T14:00:00+02:00), got "${value}"`
        }
    }
    return null
}

export const endpointFor = (
    id: CapabilityId,
    params: Record<string, string>,
    body?: Record<string, unknown>
): Proposal['endpoint'] => {
    const { route } = getCapability(id)
    if (!route || route.method === 'GET') throw new Error(`Capability ${id} has no write route`)
    const path = route.path.replace(/:(\w+)/g, (_, name: string) => {
        const value = params[name]
        if (!value) throw new Error(`Missing path parameter ${name} for ${id}`)
        return encodeURIComponent(value)
    })
    return body === undefined ? { method: route.method, path } : { method: route.method, path, body }
}

export const matchesRoute = (route: RouteRef, endpoint: Proposal['endpoint']): boolean =>
    route.method === endpoint.method && new RegExp(`^${route.path.replace(/:\w+/g, '[^/]+')}$`).test(endpoint.path)

export const RATIONALE_PARAM = { type: 'string', description: 'One short sentence explaining why.' }

export const expectedParam = (field: string, listTool: string) => ({
    type: 'string',
    description: `The ${field} exactly as ${listTool} returned it (sanity check against the id).`,
})

const normalizeForCompare = (value: unknown): string =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : ''

export type ExpectedCheck = {
    arg: string
    value: unknown
    actual: unknown
    entity: string
    id: string
    listTool: string
}

// The model must echo the name it read for the id it targets; a mismatch means it mixed up two ids.
export const expectedMismatch = ({ arg, value, actual, entity, id, listTool }: ExpectedCheck): string | null => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return `${arg} is required and must be the value returned by ${listTool}.`
    }
    if (normalizeForCompare(value) === normalizeForCompare(actual)) return null
    return `${arg} (${JSON.stringify(value)}) does not match the ${entity} document at ${id} (current: ${JSON.stringify(
        actual ?? null
    )}). Re-run ${listTool} to find the correct id+name pair before proposing.`
}

export const stringArg = (args: ToolArgs, name: string): string => (typeof args?.[name] === 'string' ? args[name] : '')

export const rejected = (error: string): DraftResult => ({ ok: false, error })

const sanitizeRationale = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length === 0 ? undefined : trimmed
}

// The JSON round trip drops undefined values (Firestore rejects them when Slack stores the proposal) and the
// target / summary fit the audit log limits.
export const proposed = (
    args: ToolArgs,
    { summary, target, ...fields }: Omit<ProposalDraft, 'rationale'>
): DraftResult => {
    const draft: ProposalDraft = {
        ...fields,
        summary: truncate(summary, AI_ACTION_SUMMARY_MAX),
        target: {
            id: truncate(target.id, AI_ACTION_ID_MAX),
            ...(target.label === undefined ? {} : { label: truncate(target.label, AI_ACTION_LABEL_MAX) }),
        },
        rationale: sanitizeRationale(args?.rationale),
    }
    return { ok: true, draft: JSON.parse(JSON.stringify(draft)) }
}

// Before-values of the patched fields, null when the document has none.
export const snapshot = (doc: Record<string, any> | null | undefined, keys: string[]): Record<string, any> =>
    Object.fromEntries(keys.map((key) => [key, doc?.[key] !== undefined ? doc[key] : null]))

export const fieldsParam = (allowed: readonly string[]) => ({
    type: 'array',
    items: { type: 'string', enum: [...allowed] },
    description:
        'Optional projection. When provided, only the listed fields are returned (subset of the allowed list). Use it to keep payloads small. id is always included.',
})

// Missing `fields` means the default projection; an explicit list (even empty) is honoured.
export const projectFields = (
    obj: Record<string, any>,
    requestedFields: unknown,
    allowed: readonly string[],
    defaults: readonly string[]
): Record<string, any> => {
    const effective = Array.isArray(requestedFields)
        ? requestedFields.filter((f): f is string => typeof f === 'string' && allowed.includes(f))
        : [...defaults]
    const out: Record<string, any> = {}
    for (const key of effective) {
        if (obj?.[key] !== undefined) out[key] = obj[key]
    }
    if (obj?.id !== undefined && out.id === undefined) out.id = obj.id
    return out
}

export const listLimit = (value: unknown): number => (typeof value === 'number' ? Math.min(value, 500) : 200)
