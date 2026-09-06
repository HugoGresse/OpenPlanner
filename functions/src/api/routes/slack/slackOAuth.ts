import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { EventDao } from '../../dao/eventDao'
import { SlackInstallationDao } from '../../dao/slackInstallationDao'
import { exchangeSlackOAuthCode, listSlackChannels } from './slackApi'
import { buildSlackAuthorizeUrl, getSlackAppConfig, isAllowedReturnTo, isOfficialSlackAppEnabled } from './slackConfig'
import { SLACK_OAUTH_STATE_TTL_MS, decodeSlackOAuthState, encodeSlackOAuthState } from './slackOAuthState'

const eventIdParam = { type: 'object', properties: { eventId: { type: 'string' } }, required: ['eventId'] }
const apiKeyQuery = {
    type: 'object',
    properties: { apiKey: { type: 'string', description: 'The API key of the event' } },
}

const withResult = (returnTo: string, result: 'connected' | 'error', reason?: string) => {
    const url = new URL(returnTo)
    url.searchParams.set('slack', result)
    if (reason) url.searchParams.set('reason', reason)
    return url.toString()
}

const installRouteHandler = () => {
    return async (
        request: FastifyRequest<{ Params: { eventId: string }; Querystring: { apiKey?: string; returnTo?: string } }>,
        reply: FastifyReply
    ) => {
        const config = getSlackAppConfig()
        if (!config) return reply.status(404).send({ error: 'Official Slack app is not configured on this server' })
        const returnTo = request.query.returnTo ?? ''
        if (!isAllowedReturnTo(returnTo, process.env.PUBLIC_APP_URL)) {
            return reply.status(400).send({ error: 'returnTo must point to the OpenPlanner app' })
        }
        const state = encodeSlackOAuthState(config.clientSecret, {
            eventId: request.params.eventId,
            returnTo,
            exp: Date.now() + SLACK_OAUTH_STATE_TTL_MS,
        })
        return reply.redirect(302, buildSlackAuthorizeUrl(config.clientId, state))
    }
}

const callbackRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{ Querystring: { code?: string; state?: string; error?: string } }>,
        reply: FastifyReply
    ) => {
        const config = getSlackAppConfig()
        if (!config) return reply.status(404).send({ error: 'Official Slack app is not configured on this server' })
        const state = decodeSlackOAuthState(config.clientSecret, request.query.state)
        if (!state) return reply.status(400).send({ error: 'Invalid or expired Slack OAuth state' })
        if (request.query.error || !request.query.code) {
            return reply.redirect(302, withResult(state.returnTo, 'error', request.query.error || 'missing_code'))
        }
        try {
            const install = await exchangeSlackOAuthCode(config.clientId, config.clientSecret, request.query.code)
            await SlackInstallationDao.saveInstallation(fastify.firebase, {
                teamId: install.teamId,
                teamName: install.teamName,
                botToken: install.botToken,
                botUserId: install.botUserId,
                installedByUserId: install.authedUserId,
            })
            await EventDao.patchEvent(fastify.firebase, state.eventId, {
                slackTeamId: install.teamId,
                slackTeamName: install.teamName,
                slackChannelId: null,
                slackChannelName: null,
            })
            return reply.redirect(302, withResult(state.returnTo, 'connected'))
        } catch (error) {
            console.error('[slack oauth] callback failed', error)
            return reply.redirect(302, withResult(state.returnTo, 'error', 'exchange_failed'))
        }
    }
}

const channelsRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Params: { eventId: string } }>, reply: FastifyReply) => {
        const event = await EventDao.getEvent(fastify.firebase, request.params.eventId)
        if (!event.slackTeamId) return reply.status(400).send({ error: 'Slack workspace is not connected' })
        const installation = await SlackInstallationDao.getInstallation(fastify.firebase, event.slackTeamId)
        if (!installation) return reply.status(400).send({ error: 'Slack app was uninstalled from the workspace' })
        try {
            return reply.status(200).send({ channels: await listSlackChannels(installation.botToken) })
        } catch (error) {
            return reply.status(502).send({ error: error instanceof Error ? error.message : 'Slack API failed' })
        }
    }
}

export const slackOAuthRoutes = (fastify: FastifyInstance) => {
    fastify.get(
        '/v1/slack/config',
        {
            schema: {
                tags: ['slack'],
                summary: 'Whether the official OpenPlanner Slack app is available on this server',
                response: { 200: Type.Object({ officialApp: Type.Boolean() }) },
            },
        },
        async (_request, reply) => reply.status(200).send({ officialApp: isOfficialSlackAppEnabled() })
    )

    fastify.get<{ Params: { eventId: string }; Querystring: { apiKey?: string; returnTo?: string } }>(
        '/v1/:eventId/slack/install',
        {
            schema: {
                tags: ['slack'],
                summary: 'Start the "Add to Slack" OAuth flow for an event (redirects to Slack)',
                params: eventIdParam,
                querystring: {
                    ...apiKeyQuery,
                    properties: {
                        ...apiKeyQuery.properties,
                        returnTo: { type: 'string', description: 'OpenPlanner page to return to after install' },
                    },
                },
                security: [{ apiKey: [] }],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        installRouteHandler()
    )

    fastify.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
        '/v1/slack/oauth/callback',
        {
            schema: {
                tags: ['slack'],
                summary: 'Slack OAuth redirect URL: stores the workspace install and links it to the event',
            },
        },
        callbackRouteHandler(fastify)
    )

    fastify.get<{ Params: { eventId: string } }>(
        '/v1/:eventId/slack/channels',
        {
            schema: {
                tags: ['slack'],
                summary: 'List channels of the connected Slack workspace (to assign one to the event)',
                params: eventIdParam,
                querystring: apiKeyQuery,
                security: [{ apiKey: [] }],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        channelsRouteHandler(fastify)
    )
}
