import { describe, expect, test, vi } from 'vitest'
import {
    handleMcpMessage,
    LEGACY_VERSIONS,
    MCP_ERROR,
    McpServer,
    MODERN_VERSION,
    SUPPORTED_VERSIONS,
    UnknownMcpToolError,
} from './mcpProtocol'

const server: McpServer = {
    info: { name: 'openplanner', title: 'OpenPlanner', version: '1.0.0' },
    instructions: 'Use the tools.',
    tools: [{ name: 'getEvent', description: 'Read the event', inputSchema: { type: 'object' } }],
    callTool: vi.fn(async (name: string) => {
        if (name !== 'getEvent') throw new UnknownMcpToolError(name)
        return { content: [{ type: 'text' as const, text: '{"id":"evt"}' }], structuredContent: { id: 'evt' } }
    }),
}

const meta = (version = MODERN_VERSION) => ({
    'io.modelcontextprotocol/protocolVersion': version,
    'io.modelcontextprotocol/clientCapabilities': {},
})

const modern = (method: string, params: object = {}, headers: Record<string, string> = {}) =>
    handleMcpMessage(
        { jsonrpc: '2.0', id: 1, method, params: { ...params, _meta: meta() } },
        { 'mcp-protocol-version': MODERN_VERSION, 'mcp-method': method, ...headers },
        server
    )

const legacy = (method: string, params?: object) =>
    handleMcpMessage({ jsonrpc: '2.0', id: 1, method, params }, {}, server)

const errorOf = (reply: { body?: object }) => (reply.body as { error: { code: number; data?: unknown } }).error
const resultOf = (reply: { body?: object }) => (reply.body as { result: Record<string, unknown> }).result

describe('modern protocol (2026-07-28)', () => {
    test('server/discover lists every supported version, the tools capability and the server identity', async () => {
        const reply = await modern('server/discover')
        expect(reply.status).toBe(200)
        expect(resultOf(reply)).toMatchObject({
            resultType: 'complete',
            supportedVersions: SUPPORTED_VERSIONS,
            capabilities: { tools: {} },
            instructions: 'Use the tools.',
            _meta: { 'io.modelcontextprotocol/serverInfo': { name: 'openplanner' } },
        })
    })

    test('tools/list and tools/call answer with resultType complete', async () => {
        expect(resultOf(await modern('tools/list'))).toMatchObject({ resultType: 'complete', tools: server.tools })
        const call = await modern('tools/call', { name: 'getEvent', arguments: {} }, { 'mcp-name': 'getEvent' })
        expect(resultOf(call)).toMatchObject({ resultType: 'complete', structuredContent: { id: 'evt' } })
    })

    test('Mcp-Name may use the base64 sentinel encoding', async () => {
        const encoded = `=?base64?${Buffer.from('getEvent').toString('base64')}?=`
        const call = await modern('tools/call', { name: 'getEvent' }, { 'mcp-name': encoded })
        expect(call.status).toBe(200)
    })

    test('headers that are missing or differ from the body are a 400 HeaderMismatch', async () => {
        const noMethod = await handleMcpMessage(
            { jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: meta() } },
            { 'mcp-protocol-version': MODERN_VERSION },
            server
        )
        expect(noMethod.status).toBe(400)
        expect(errorOf(noMethod).code).toBe(MCP_ERROR.headerMismatch)

        const wrongName = await modern('tools/call', { name: 'getEvent' }, { 'mcp-name': 'other' })
        expect(errorOf(wrongName).code).toBe(MCP_ERROR.headerMismatch)
    })

    test('an unsupported version names the supported ones, missing _meta fields are invalid params', async () => {
        const future = await handleMcpMessage(
            { jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: meta('2030-01-01') } },
            { 'mcp-protocol-version': '2030-01-01', 'mcp-method': 'tools/list' },
            server
        )
        expect(future.status).toBe(400)
        expect(errorOf(future)).toMatchObject({
            code: MCP_ERROR.unsupportedVersion,
            data: { supported: SUPPORTED_VERSIONS, requested: '2030-01-01' },
        })

        const noMeta = await handleMcpMessage(
            { jsonrpc: '2.0', id: 1, method: 'server/discover' },
            { 'mcp-protocol-version': MODERN_VERSION, 'mcp-method': 'server/discover' },
            server
        )
        expect(noMeta.status).toBe(400)
        expect(errorOf(noMeta).code).toBe(MCP_ERROR.invalidParams)
    })

    test('an unknown method is a 404 with a JSON-RPC error body', async () => {
        const reply = await modern('resources/list')
        expect(reply.status).toBe(404)
        expect(errorOf(reply).code).toBe(MCP_ERROR.methodNotFound)
    })
})

describe('legacy protocol (initialize handshake)', () => {
    test('initialize echoes a supported version, falls back to the latest legacy one otherwise', async () => {
        const known = await legacy('initialize', { protocolVersion: '2025-06-18', capabilities: {} })
        expect(resultOf(known)).toMatchObject({
            protocolVersion: '2025-06-18',
            capabilities: { tools: {} },
            serverInfo: { name: 'openplanner' },
        })
        expect(resultOf(known)).not.toHaveProperty('resultType')
        const unknown = await legacy('initialize', { protocolVersion: '2024-11-05' })
        expect(resultOf(unknown).protocolVersion).toBe(LEGACY_VERSIONS[0])
    })

    test('notifications are accepted without a body', async () => {
        const notification = { jsonrpc: '2.0', method: 'notifications/initialized' }
        expect(await handleMcpMessage(notification, {}, server)).toEqual({ status: 202 })
    })

    test('tools/list, tools/call and ping work without any session', async () => {
        expect(resultOf(await legacy('tools/list'))).toEqual({ tools: server.tools })
        expect(resultOf(await legacy('tools/call', { name: 'getEvent' }))).toMatchObject({
            structuredContent: { id: 'evt' },
        })
        expect(resultOf(await legacy('ping'))).toEqual({})
    })

    test('unknown tool and unknown method are JSON-RPC errors', async () => {
        expect(errorOf(await legacy('tools/call', { name: 'nope' })).code).toBe(MCP_ERROR.invalidParams)
        expect(errorOf(await legacy('prompts/list')).code).toBe(MCP_ERROR.methodNotFound)
    })
})

test('anything that is not a single JSON-RPC 2.0 message is rejected', async () => {
    for (const body of [null, 'x', [], [{ jsonrpc: '2.0', id: 1, method: 'ping' }], { id: 1, method: 'ping' }]) {
        const reply = await handleMcpMessage(body, {}, server)
        expect(reply.status).toBe(400)
        expect(errorOf(reply).code).toBe(MCP_ERROR.invalidRequest)
    }
})
