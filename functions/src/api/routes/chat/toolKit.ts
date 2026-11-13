import firebase from 'firebase-admin'
import { TSchema } from 'typebox'
import { FastifySchemaValidationError } from 'fastify/types/schema'
import { ProposalKind, ProposalMethod } from '../../../../../src/events/page/chat/proposalKinds'
import { strictBodyValidatorCompiler } from '../../other/strictValidator'
import { CapabilityId, getCapability } from './capabilities'

export type ToolDefinition = {
    type: 'function'
    function: { name: string; description: string; parameters: object }
}

export type ToolContext = { firebaseApp: firebase.app.App; eventId: string }
export type ToolArgs = Record<string, any>

export type Proposal = {
    kind: ProposalKind
    // Built by the server from the resolved target, never sourced from the model.
    summary: string
    // Model-authored explanation (`rationale` argument), shown as "Reason (from assistant)".
    rationale?: string
    // Called (relative to the API base, with the event API key) when the user clicks Apply.
    endpoint: { method: ProposalMethod; path: string; body?: Record<string, any> }
    target: { id: string; label?: string }
    // Field-level before/after. For deletes, `before` is the record snapshot and `after` is null.
    diff: { before: Record<string, any>; after: Record<string, any> | null }
}

export type BuildProposalResult = { ok: true; proposal: Proposal } | { ok: false; error: string }

type ToolBase = {
    name: string
    description: string
    parameters: object
    // The capabilities (see capabilities/) this tool gives the assistant.
    capabilities: CapabilityId[]
}
export type ReadTool = ToolBase & { type: 'read'; run: (ctx: ToolContext, args: ToolArgs) => Promise<unknown> }
export type ProposalTool = ToolBase & {
    type: 'proposal'
    kind: ProposalKind
    build: (ctx: ToolContext, args: ToolArgs) => Promise<BuildProposalResult>
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

// TypeBox schemas are JSON Schema plus symbol-keyed metadata; a JSON round trip keeps the plain schema the
// model sees. `omit` drops properties the server fills itself (e.g. generated ids).
export const toJsonSchema = (schema: TSchema, omit: string[] = []): Record<string, any> => {
    const json = JSON.parse(JSON.stringify(schema))
    for (const key of omit) delete json.properties?.[key]
    if (Array.isArray(json.required)) {
        json.required = json.required.filter((key: string) => !omit.includes(key))
        if (json.required.length === 0) delete json.required
    }
    return json
}

export const schemaFields = (schema: TSchema): string[] =>
    Object.keys((schema as { properties?: object }).properties ?? {})

// Keeps only the fields the route body accepts: anything else the model sends is dropped before review.
export const pickSchemaFields = (input: unknown, schema: TSchema): Record<string, any> => {
    const out: Record<string, any> = {}
    if (!input || typeof input !== 'object') return out
    for (const key of schemaFields(schema)) {
        if (Object.prototype.hasOwnProperty.call(input, key)) out[key] = (input as Record<string, any>)[key]
    }
    return out
}

type Validate = ((value: unknown) => boolean) & { errors?: FastifySchemaValidationError[] | null }
const validators = new WeakMap<TSchema, Validate>()

const formatValidationError = (error: FastifySchemaValidationError): string => {
    const at = error.instancePath || 'body'
    const extra = (error.params as { additionalProperty?: string })?.additionalProperty
    return extra ? `${at} has unknown field "${extra}"` : `${at} ${error.message ?? 'is invalid'}`
}

// Same validator as the create routes (strict body compiler), so the model learns about an invalid field
// when it proposes, not when the user clicks Apply.
export const validateBody = (schema: TSchema, body: unknown): string | null => {
    let validate = validators.get(schema)
    if (!validate) {
        validate = strictBodyValidatorCompiler({ schema, httpPart: 'body', method: 'POST', url: '/' }) as Validate
        validators.set(schema, validate)
    }
    if (validate(body)) return null
    return `Invalid body: ${(validate.errors ?? []).map(formatValidationError).join('; ')}`
}

export const endpointFor = (
    id: CapabilityId,
    params: Record<string, string>,
    body?: Record<string, any>
): Proposal['endpoint'] => {
    const { route } = getCapability(id)
    if (!route || route.method === 'GET') throw new Error(`Capability ${id} has no write route`)
    const path = route.path.replace(/:(\w+)/g, (_, name: string) => {
        const value = params[name]
        if (value === undefined) throw new Error(`Missing path parameter ${name} for ${id}`)
        return encodeURIComponent(value)
    })
    return body === undefined ? { method: route.method, path } : { method: route.method, path, body }
}

export const RATIONALE_PARAM = { type: 'string', description: 'One short sentence explaining why.' }

export const expectedParam = (field: string, listTool: string) => ({
    type: 'string',
    description: `The ${field} as returned by ${listTool}. Sanity check against the id: compared case- and whitespace-insensitively, the server rejects the call on a mismatch.`,
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

export const rejected = (error: string): BuildProposalResult => ({ ok: false, error })

const sanitizeRationale = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length === 0 ? undefined : trimmed
}

export const IRREVERSIBLE = ' (cannot be undone)'

export const proposed = (
    kind: ProposalKind,
    args: ToolArgs,
    fields: Omit<Proposal, 'kind' | 'rationale'>
): BuildProposalResult => ({ ok: true, proposal: { kind, ...fields, rationale: sanitizeRationale(args?.rationale) } })

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
