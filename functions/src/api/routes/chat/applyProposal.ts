import { FastifyInstance } from 'fastify'
import { Proposal } from './toolKit'

export type ApplyOutcome = { applied: true; status: number; body: string } | { applied: false; error: string }

const MAX_ERROR_BODY = 300

// Applying a proposal replays the REST call it describes through the app itself, with the event API key: the
// route's own validation and side effects run exactly as for the web UI. Used by the Slack buttons and by MCP.
export const applyProposalEndpoint = async (
    fastify: FastifyInstance,
    apiKey: string,
    { method, path, body }: Proposal['endpoint']
): Promise<ApplyOutcome> => {
    const response = await fastify.inject({
        method,
        url: `${path}?apiKey=${encodeURIComponent(apiKey)}`,
        payload: method === 'DELETE' ? undefined : body,
    })
    if (response.statusCode >= 200 && response.statusCode < 300) {
        return { applied: true, status: response.statusCode, body: response.body }
    }
    return {
        applied: false,
        error: `API responded ${response.statusCode}: ${response.body.slice(0, MAX_ERROR_BODY)}`,
    }
}
