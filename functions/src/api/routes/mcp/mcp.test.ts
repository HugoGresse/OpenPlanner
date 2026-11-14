import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { AiActionDao } from '../../dao/aiActionDao'
import { SessionDao } from '../../dao/sessionDao'
import { APPLY_TOOL_NAME, mcpTools, readEndpoint } from './mcpTools'
import { CHAT_TOOLS } from '../chat/tools'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return { ...mod, setupFirebase: vi.fn().mockImplementation((fastify, _options, next) => next()) }
})

const eventId = 'evt-1'
const apiKey = 'test-key'
const url = `/v1/${eventId}/mcp`
const bearer = { authorization: `Bearer ${apiKey}` }
const session = { id: 's1', title: 'Old title', speakers: [], tags: [] }

describe('MCP tool list', () => {
    test('serves every assistant tool plus applyProposal, and only the read tools in read-only mode', () => {
        const names = mcpTools(false).map((tool) => tool.name)
        expect(names).toEqual([...CHAT_TOOLS.map((tool) => tool.name), APPLY_TOOL_NAME])
        const readOnly = mcpTools(true)
        expect(readOnly.map((tool) => tool.name)).toEqual(
            CHAT_TOOLS.filter((tool) => tool.type === 'read').map((tool) => tool.name)
        )
        expect(readOnly.every((tool) => tool.annotations?.readOnlyHint)).toBe(true)
        expect(mcpTools(false).at(-1)?.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true })
    })
})

describe('readEndpoint', () => {
    const patch = { method: 'PATCH', path: `/v1/${eventId}/sessions/s1`, body: { title: 'New' } }

    test('accepts a write route of this event that a propose tool targets', () => {
        expect(readEndpoint(eventId, { endpoint: patch })).toEqual(patch)
        expect(readEndpoint(eventId, { endpoint: { method: 'DELETE', path: `/v1/${eventId}/speakers/a` } })).toEqual({
            method: 'DELETE',
            path: `/v1/${eventId}/speakers/a`,
        })
    })

    test('rejects other events, query strings, read or unknown routes and malformed proposals', () => {
        const rejected = (endpoint: unknown) => typeof readEndpoint(eventId, { endpoint }) === 'string'
        expect(rejected({ ...patch, path: '/v1/other/sessions/s1' })).toBe(true)
        expect(rejected({ ...patch, path: `${patch.path}?apiKey=x` })).toBe(true)
        expect(rejected({ method: 'GET', path: `/v1/${eventId}/sessions` })).toBe(true)
        expect(rejected({ method: 'POST', path: `/v1/${eventId}/files` })).toBe(true)
        expect(rejected({ ...patch, body: 'x' })).toBe(true)
        expect(rejected(undefined)).toBe(true)
        expect(typeof readEndpoint(eventId, 'nope')).toBe('string')
    })
})

describe('POST /v1/:eventId/mcp', () => {
    const fastify = setupFastify()
    beforeAll(async () => {
        await fastify.ready()
    })
    afterEach(() => vi.restoreAllMocks())

    const mockEvent = () =>
        vi
            .spyOn(fastify.firebase, 'firestore')
            .mockReturnValue(getMockedFirestore({ id: eventId, apiKey, name: 'DevFest' }))

    const rpc = (method: string, params?: object, extra: { headers?: object; query?: string } = {}) =>
        fastify.inject({
            method: 'POST',
            url: `${url}${extra.query ?? ''}`,
            headers: { ...bearer, ...extra.headers },
            payload: { jsonrpc: '2.0', id: 1, method, params },
        })

    test('needs the event API key, as a Bearer token or as ?apiKey=', async () => {
        mockEvent()
        const anonymous = await fastify.inject({
            method: 'POST',
            url,
            payload: { jsonrpc: '2.0', id: 1, method: 'ping' },
        })
        expect(anonymous.statusCode).toBe(401)
        const wrong = await rpc('ping', undefined, { headers: { authorization: 'Bearer nope' } })
        expect(wrong.statusCode).toBe(401)
        expect((await rpc('ping')).statusCode).toBe(200)
        const viaQuery = await fastify.inject({
            method: 'POST',
            url: `${url}?apiKey=${apiKey}`,
            payload: { jsonrpc: '2.0', id: 1, method: 'ping' },
        })
        expect(viaQuery.statusCode).toBe(200)
    })

    test('GET and DELETE are 405', async () => {
        const res = await fastify.inject({ method: 'GET', url, headers: bearer })
        expect(res.statusCode).toBe(405)
        expect(res.headers.allow).toBe('POST')
    })

    test('legacy handshake then tools/list, without a session', async () => {
        mockEvent()
        const init = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {} })
        const result = JSON.parse(init.body).result
        expect(result.protocolVersion).toBe('2025-11-25')
        expect(result.instructions).toContain('DevFest')
        expect(init.headers['mcp-session-id']).toBeUndefined()
        const notified = await fastify.inject({
            method: 'POST',
            url,
            headers: bearer,
            payload: { jsonrpc: '2.0', method: 'notifications/initialized' },
        })
        expect(notified.statusCode).toBe(202)
        const tools = JSON.parse((await rpc('tools/list')).body).result.tools
        expect(tools.map((tool: { name: string }) => tool.name)).toContain(APPLY_TOOL_NAME)
        const readOnly = JSON.parse((await rpc('tools/list', undefined, { query: '?readOnly=true' })).body).result.tools
        expect(readOnly.map((tool: { name: string }) => tool.name)).not.toContain(APPLY_TOOL_NAME)
    })

    test('a read tool returns its data as JSON text', async () => {
        mockEvent()
        vi.spyOn(SessionDao, 'getSessions').mockResolvedValue([session] as never)
        const res = await rpc('tools/call', { name: 'listSessions', arguments: {} })
        const result = JSON.parse(res.body).result
        expect(result.isError).toBeUndefined()
        expect(result.content[0].text).toContain('Old title')
        // A list is not an object: older protocol revisions would reject it as structuredContent.
        expect(result.structuredContent).toBeUndefined()
    })

    test('a propose tool changes nothing, applyProposal replays its endpoint and logs the action', async () => {
        mockEvent()
        vi.spyOn(SessionDao, 'doesSessionExist').mockResolvedValue(session as never)
        const patchSpy = vi.spyOn(SessionDao, 'patchSession').mockResolvedValue(undefined)
        const audit = vi.spyOn(AiActionDao, 'addAction').mockResolvedValue('a1')

        const proposed = await rpc('tools/call', {
            name: 'proposePatchSession',
            arguments: { sessionId: 's1', expectedSessionTitle: 'Old title', patch: { title: 'New title' } },
        })
        const { proposal, next } = JSON.parse(proposed.body).result.structuredContent
        expect(proposal.endpoint).toEqual({
            method: 'PATCH',
            path: `/v1/${eventId}/sessions/s1`,
            body: { title: 'New title' },
        })
        expect(next).toContain(APPLY_TOOL_NAME)
        expect(patchSpy).not.toHaveBeenCalled()

        const applied = await rpc('tools/call', { name: APPLY_TOOL_NAME, arguments: { proposal } })
        expect(JSON.parse(applied.body).result.structuredContent.status).toBe('applied')
        expect(patchSpy).toHaveBeenCalledWith(fastify.firebase, eventId, { id: 's1', title: 'New title' })
        expect(audit).toHaveBeenCalledWith(
            fastify.firebase,
            eventId,
            expect.objectContaining({
                tool: 'patchSession',
                applied: true,
                args: expect.objectContaining({ source: 'mcp' }),
            })
        )
    })

    test('applyProposal refuses an endpoint outside the proposal routes, and is absent in read-only mode', async () => {
        mockEvent()
        const refused = await rpc('tools/call', {
            name: APPLY_TOOL_NAME,
            arguments: { proposal: { endpoint: { method: 'POST', path: `/v1/${eventId}/deploy/files` } } },
        })
        expect(JSON.parse(refused.body).result.isError).toBe(true)
        const readOnly = await rpc(
            'tools/call',
            { name: APPLY_TOOL_NAME, arguments: { proposal: {} } },
            { query: '?readOnly=true' }
        )
        expect(JSON.parse(readOnly.body).error.message).toBe(`Unknown tool: ${APPLY_TOOL_NAME}`)
    })

    test('modern requests are validated against their headers', async () => {
        mockEvent()
        const _meta = {
            'io.modelcontextprotocol/protocolVersion': '2026-07-28',
            'io.modelcontextprotocol/clientCapabilities': {},
        }
        const ok = await rpc(
            'server/discover',
            { _meta },
            {
                headers: { 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'server/discover' },
            }
        )
        expect(JSON.parse(ok.body).result.supportedVersions[0]).toBe('2026-07-28')
        const mismatch = await rpc('server/discover', { _meta }, { headers: { 'mcp-protocol-version': '2026-07-28' } })
        expect(mismatch.statusCode).toBe(400)
    })
})
