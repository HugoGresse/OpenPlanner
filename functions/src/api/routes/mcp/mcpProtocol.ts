// Stateless Model Context Protocol endpoint logic (Streamable HTTP, JSON responses only), independent of
// Fastify and of the tools it serves. It answers both protocol eras on the same URL:
// - modern (2026-07-28): no handshake, every request carries its version in `_meta` and in HTTP headers;
// - legacy (2025-03-26 to 2025-11-25): `initialize` handshake first, which this server answers without
//   keeping a session.

export const MODERN_VERSION = '2026-07-28'
export const LEGACY_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26']
export const SUPPORTED_VERSIONS = [MODERN_VERSION, ...LEGACY_VERSIONS]

const META_VERSION = 'io.modelcontextprotocol/protocolVersion'
const META_CLIENT_CAPABILITIES = 'io.modelcontextprotocol/clientCapabilities'
const META_SERVER_INFO = 'io.modelcontextprotocol/serverInfo'

export const MCP_ERROR = {
    invalidRequest: -32600,
    methodNotFound: -32601,
    invalidParams: -32602,
    internal: -32603,
    headerMismatch: -32020,
    unsupportedVersion: -32022,
} as const

export type McpTool = {
    name: string
    description: string
    inputSchema: object
    annotations?: {
        readOnlyHint?: boolean
        destructiveHint?: boolean
        idempotentHint?: boolean
        openWorldHint?: boolean
    }
}

export type McpToolResult = {
    content: Array<{ type: 'text'; text: string }>
    structuredContent?: unknown
    isError?: boolean
}

export class UnknownMcpToolError extends Error {}

export type McpServer = {
    info: { name: string; title: string; version: string }
    instructions: string
    tools: McpTool[]
    // Throws UnknownMcpToolError for a name it does not serve; any other failure is a tool result with isError.
    callTool: (name: string, args: Record<string, unknown>) => Promise<McpToolResult>
}

export type McpReply = { status: number; body?: object }
export type McpHeaders = Record<string, string | string[] | undefined>

type JsonObject = Record<string, unknown>
type RequestId = string | number

const isObject = (value: unknown): value is JsonObject =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const header = (headers: McpHeaders, name: string): string | undefined => {
    const value = headers[name]
    return Array.isArray(value) ? value[0] : value
}

const BASE64_SENTINEL = /^=\?base64\?(.*)\?=$/

const decodeHeaderValue = (value: string | undefined): string | undefined => {
    const encoded = value?.match(BASE64_SENTINEL)?.[1]
    return encoded === undefined ? value : Buffer.from(encoded, 'base64').toString('utf8')
}

const failure = (status: number, id: RequestId | null, code: number, message: string, data?: unknown): McpReply => ({
    status,
    body: { jsonrpc: '2.0', ...(id === null ? {} : { id }), error: { code, message, ...(data ? { data } : {}) } },
})

const success = (id: RequestId, result: JsonObject): McpReply => ({ status: 200, body: { jsonrpc: '2.0', id, result } })

const callTool = async (
    server: McpServer,
    id: RequestId,
    params: JsonObject,
    wrap: (result: JsonObject) => JsonObject
) => {
    const { name, arguments: args } = params
    if (typeof name !== 'string' || (args !== undefined && !isObject(args))) {
        return failure(200, id, MCP_ERROR.invalidParams, 'tools/call needs a tool `name` and an `arguments` object')
    }
    try {
        return success(id, wrap(await server.callTool(name, args ?? {})))
    } catch (error) {
        if (error instanceof UnknownMcpToolError) {
            return failure(200, id, MCP_ERROR.invalidParams, `Unknown tool: ${name}`)
        }
        console.error('MCP tool call failed', name, error)
        return failure(500, id, MCP_ERROR.internal, 'Tool call failed')
    }
}

const capabilities = { tools: {} }

const handleModern = async (
    server: McpServer,
    id: RequestId,
    method: string,
    params: JsonObject,
    headers: McpHeaders
): Promise<McpReply> => {
    const meta = isObject(params._meta) ? params._meta : {}
    const version = meta[META_VERSION]
    if (typeof version !== 'string' || !isObject(meta[META_CLIENT_CAPABILITIES])) {
        return failure(
            400,
            id,
            MCP_ERROR.invalidParams,
            `Missing required _meta fields: ${META_VERSION}, ${META_CLIENT_CAPABILITIES}`
        )
    }
    const mismatch = (name: string) =>
        failure(
            400,
            id,
            MCP_ERROR.headerMismatch,
            `Header mismatch: ${name} is missing or differs from the request body`
        )
    if (header(headers, 'mcp-protocol-version') !== version) return mismatch('MCP-Protocol-Version')
    if (version !== MODERN_VERSION) {
        return failure(400, id, MCP_ERROR.unsupportedVersion, 'Unsupported protocol version', {
            supported: SUPPORTED_VERSIONS,
            requested: version,
        })
    }
    if (header(headers, 'mcp-method') !== method) return mismatch('Mcp-Method')
    if (method === 'tools/call' && decodeHeaderValue(header(headers, 'mcp-name')) !== params.name) {
        return mismatch('Mcp-Name')
    }

    const wrap = (result: JsonObject): JsonObject => ({
        resultType: 'complete',
        ...result,
        _meta: { [META_SERVER_INFO]: server.info },
    })
    switch (method) {
        case 'server/discover':
            return success(
                id,
                wrap({ supportedVersions: SUPPORTED_VERSIONS, capabilities, instructions: server.instructions })
            )
        case 'tools/list':
            return success(id, wrap({ tools: server.tools }))
        case 'tools/call':
            return callTool(server, id, params, wrap)
        case 'ping':
            return success(id, wrap({}))
        default:
            return failure(404, id, MCP_ERROR.methodNotFound, `Method not found: ${method}`)
    }
}

const handleLegacy = async (
    server: McpServer,
    id: RequestId,
    method: string,
    params: JsonObject
): Promise<McpReply> => {
    switch (method) {
        case 'initialize': {
            const requested = params.protocolVersion
            const protocolVersion =
                typeof requested === 'string' && LEGACY_VERSIONS.includes(requested) ? requested : LEGACY_VERSIONS[0]
            return success(id, {
                protocolVersion,
                capabilities,
                serverInfo: server.info,
                instructions: server.instructions,
            })
        }
        case 'tools/list':
            return success(id, { tools: server.tools })
        case 'tools/call':
            return callTool(server, id, params, (result) => result)
        case 'ping':
            return success(id, {})
        default:
            return failure(200, id, MCP_ERROR.methodNotFound, `Method not found: ${method}`)
    }
}

export const handleMcpMessage = async (message: unknown, headers: McpHeaders, server: McpServer): Promise<McpReply> => {
    if (!isObject(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
        return failure(400, null, MCP_ERROR.invalidRequest, 'Expected a single JSON-RPC 2.0 request or notification')
    }
    const { id, method } = message
    // Notifications (e.g. notifications/initialized from legacy clients) are accepted and need no answer.
    if (id === undefined) return { status: 202 }
    if (typeof id !== 'string' && typeof id !== 'number') {
        return failure(400, null, MCP_ERROR.invalidRequest, 'Request id must be a string or a number')
    }
    const params = isObject(message.params) ? message.params : {}
    const meta = isObject(params._meta) ? params._meta : {}
    const modern =
        method === 'server/discover' ||
        META_VERSION in meta ||
        header(headers, 'mcp-protocol-version') === MODERN_VERSION
    return modern ? handleModern(server, id, method, params, headers) : handleLegacy(server, id, method, params)
}
