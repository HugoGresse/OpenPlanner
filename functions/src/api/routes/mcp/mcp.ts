import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { eventIdParams } from '../../other/routeSchemas'
import { handleMcpMessage } from './mcpProtocol'
import { buildMcpServer } from './mcpTools'

const MCP_PATH = '/v1/:eventId/mcp'

type McpRoute = { Params: { eventId: string }; Querystring: { apiKey?: string; readOnly?: boolean } }

const mcpSchema = {
    tags: ['mcp'],
    summary: 'Model Context Protocol endpoint of the event (Streamable HTTP)',
    description:
        'Remote MCP server for AI clients (Claude, Codex, ChatGPT…). It serves the tools of the OpenPlanner assistant: read tools, propose* tools that only build a proposal, and applyProposal that applies one. Send JSON-RPC 2.0 messages with POST; both the 2026-07-28 protocol and the earlier initialize-based revisions are answered, statelessly. Authenticate with `Authorization: Bearer <event API key>` (or `?apiKey=`). `?readOnly=true` serves the read tools only.',
    params: eventIdParams(),
    querystring: Type.Object(
        {
            apiKey: Type.Optional(Type.String({ description: 'The API key of the event (prefer the Bearer header)' })),
            readOnly: Type.Optional(Type.Boolean({ description: 'Serve only the read tools' })),
        },
        { additionalProperties: false }
    ),
    security: [{ apiKey: [] }],
}

export const mcpRoutes = (fastify: FastifyInstance, _options: unknown, done: () => void) => {
    fastify.post<McpRoute>(
        MCP_PATH,
        { schema: mcpSchema, preHandler: fastify.auth([fastify.verifyApiKey]) },
        async (request: FastifyRequest<McpRoute>, reply: FastifyReply) => {
            const event = request.authenticatedEvent
            if (!event) return reply.code(401).send({ error: 'Unauthorized', success: false })
            const server = buildMcpServer(fastify, event, request.query.readOnly === true)
            const { status, body } = await handleMcpMessage(request.body, request.headers, server)
            return body ? reply.code(status).send(body) : reply.code(status).send()
        }
    )

    // No stream to open and no session to close: the endpoint is POST only.
    fastify.route({
        method: ['GET', 'DELETE'],
        url: MCP_PATH,
        schema: { hide: true },
        handler: (_request, reply) =>
            reply.code(405).header('allow', 'POST').send({ error: 'The MCP endpoint only accepts POST' }),
    })

    done()
}
