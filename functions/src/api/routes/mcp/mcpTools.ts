import { FastifyInstance } from 'fastify'
import { Event } from '../../../types'
import { AiActionDao } from '../../dao/aiActionDao'
import { truncate } from '../../other/truncate'
import { AI_ACTION_ID_MAX, AI_ACTION_LABEL_MAX, AI_ACTION_SUMMARY_MAX } from '../chat/aiActionsPOST'
import { applyProposalEndpoint } from '../chat/applyProposal'
import { expectedArgNames } from '../chat/capabilityDocs'
import { ChatTool, objectSchema, Proposal } from '../chat/toolKit'
import { buildProposal, CHAT_TOOLS, executeTool, proposalToolForEndpoint } from '../chat/tools'
import { McpServer, McpTool, McpToolResult, UnknownMcpToolError } from './mcpProtocol'

export const APPLY_TOOL_NAME = 'applyProposal'
const WRITE_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE']

// The assistant's tools, served as they are: read tools return data, propose* tools only build a proposal. MCP
// has no review UI of its own, so one extra tool applies a proposal once the user agreed to it.
const toMcpTool = ({ name, description, parameters }: ChatTool): McpTool => ({
    name,
    description,
    inputSchema: parameters,
    annotations: { readOnlyHint: true, openWorldHint: false },
})

const APPLY_TOOL: McpTool = {
    name: APPLY_TOOL_NAME,
    description:
        'Apply a proposal returned by a propose* tool: this is the call that changes the event. Deletes are irreversible, a deploy publishes the website and calls webhooks, pending-edit decisions email the speaker. Call it only after showing the proposal summary and diff to the user and getting their agreement. Pass the `proposal` object exactly as the propose* tool returned it.',
    inputSchema: objectSchema(
        { proposal: { type: 'object', description: 'The proposal object returned by a propose* tool.' } },
        ['proposal']
    ),
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
}

export const mcpTools = (readOnly: boolean): McpTool[] => [
    ...CHAT_TOOLS.filter((tool) => !readOnly || tool.type === 'read').map(toMcpTool),
    ...(readOnly ? [] : [APPLY_TOOL]),
]

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

// Earlier protocol revisions only allow an object as structuredContent, so lists travel as JSON text alone.
const asResult = (value: unknown, isError = false): McpToolResult => ({
    content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }],
    ...(isObject(value) ? { structuredContent: value } : {}),
    ...(isError ? { isError: true } : {}),
})

const isErrorObject = (value: unknown): value is { error: string } =>
    typeof value === 'object' && value !== null && typeof (value as { error?: unknown }).error === 'string'

// A proposal coming back from the client is untrusted: only the endpoint is acted on, and only when it is a
// write route of this event that a propose* tool can target. The route then validates the body itself.
export const readEndpoint = (eventId: string, proposal: unknown): Proposal['endpoint'] | string => {
    const endpoint = isObject(proposal) ? proposal.endpoint : undefined
    if (!isObject(endpoint) || typeof endpoint.method !== 'string' || typeof endpoint.path !== 'string') {
        return 'proposal.endpoint with a method and a path is required: pass the proposal as the propose* tool returned it'
    }
    const { method, path, body } = endpoint
    if (!WRITE_METHODS.includes(method) || /[?#]/.test(path)) return 'proposal.endpoint is not a valid write call'
    if (path.split('/')[2] !== encodeURIComponent(eventId)) return 'proposal.endpoint targets another event'
    if (body !== undefined && !isObject(body)) return 'proposal.endpoint.body must be an object'
    const candidate = { method, path, ...(body === undefined ? {} : { body }) } as Proposal['endpoint']
    return proposalToolForEndpoint(candidate) ? candidate : 'proposal.endpoint is not a route a proposal can target'
}

const text = (value: unknown, limit: number): string | undefined =>
    typeof value === 'string' && value.length > 0 ? truncate(value, limit) : undefined

const applyProposal = async (fastify: FastifyInstance, event: Event, args: Record<string, unknown>) => {
    const endpoint = readEndpoint(event.id, args.proposal)
    if (typeof endpoint === 'string') return asResult(endpoint, true)
    if (!event.apiKey) return asResult('Event API key is not set', true)
    const outcome = await applyProposalEndpoint(fastify, event.apiKey, endpoint)

    const proposal = args.proposal as Record<string, unknown>
    const target = isObject(proposal.target) ? proposal.target : {}
    const label = text(target.label, AI_ACTION_LABEL_MAX)
    await AiActionDao.addAction(fastify.firebase, event.id, {
        tool: proposalToolForEndpoint(endpoint)?.kind ?? 'unknown',
        target: {
            id: text(target.id, AI_ACTION_ID_MAX) ?? truncate(endpoint.path, AI_ACTION_ID_MAX),
            ...(label ? { label } : {}),
        },
        args: { source: 'mcp', method: endpoint.method, path: endpoint.path, body: endpoint.body ?? null },
        diff: { before: {}, after: endpoint.body ?? null },
        summary: text(proposal.summary, AI_ACTION_SUMMARY_MAX) ?? `${endpoint.method} ${endpoint.path}`,
        applied: outcome.applied,
    }).catch((error) => console.error('[mcp] audit log failed', error))

    return outcome.applied
        ? asResult({ status: 'applied', response: outcome.body })
        : asResult({ status: 'failed', error: outcome.error }, true)
}

const PROPOSAL_NEXT_STEP = `Nothing was changed. Show the summary and diff to the user; when they agree, call ${APPLY_TOOL_NAME} with this proposal.`

const callTool = async (
    fastify: FastifyInstance,
    event: Event,
    readOnly: boolean,
    name: string,
    args: Record<string, unknown>
): Promise<McpToolResult> => {
    if (name === APPLY_TOOL_NAME && !readOnly) return applyProposal(fastify, event, args)
    const tool = CHAT_TOOLS.find((item) => item.name === name)
    if (!tool || (readOnly && tool.type !== 'read')) throw new UnknownMcpToolError(name)
    if (tool.type === 'read') {
        try {
            const result = await executeTool(fastify.firebase, event.id, name, args)
            return asResult(result, isErrorObject(result))
        } catch (error) {
            return asResult(error instanceof Error ? error.message : 'Unknown error', true)
        }
    }
    const built = await buildProposal({ firebaseApp: fastify.firebase, eventId: event.id, name, args })
    return built.ok ? asResult({ proposal: built.proposal, next: PROPOSAL_NEXT_STEP }) : asResult(built.error, true)
}

const READ_RULES =
    'List and get tools return a lean projection: pass fields[] only for the heavier or private fields you need. Always list before referring to an id; never invent one.'

const writeRules = () =>
    `Write tools are named propose*: they change nothing and return a proposal (summary, diff, endpoint). Show its summary and diff to the user and call ${APPLY_TOOL_NAME} with that proposal only after they agree, never in the same step. Deletes are irreversible, proposeDeployEvent publishes the website and calls the event webhooks, pending-edit decisions email the speaker. Pass the expected* argument (${expectedArgNames().join(
        ', '
    )}) exactly as the list tool returned it. Dates are ISO 8601 with a UTC offset; the event timezone is in getEvent. File uploads, bulk import, exports, WhatsApp and Bupher are not here: use the openplanner CLI or the web admin.`

export const MCP_SERVER_VERSION = '1.0.0'

export const buildMcpServer = (fastify: FastifyInstance, event: Event, readOnly: boolean): McpServer => ({
    info: { name: 'openplanner', title: 'OpenPlanner', version: MCP_SERVER_VERSION },
    instructions: [
        `OpenPlanner event "${event.name}" (id: ${event.id})${readOnly ? ', read-only access' : ''}.`,
        READ_RULES,
        ...(readOnly ? [] : [writeRules()]),
    ].join(' '),
    tools: mcpTools(readOnly),
    callTool: (name, args) => callTool(fastify, event, readOnly, name, args),
})
