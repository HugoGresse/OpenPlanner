import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { IncomingMessage } from 'node:http'
import { Event } from '../../../types'
import { EventDao } from '../../dao/eventDao'
import { verifySlackSignature } from './slackSignature'
import { getSlackAppConfig } from './slackConfig'
import {
    slackEventsPOSTSchema,
    slackEventsRouteHandler,
    slackOfficialEventsPOSTSchema,
    slackOfficialEventsRouteHandler,
} from './slackEventsPOST'
import {
    slackInteractionsPOSTSchema,
    slackInteractionsRouteHandler,
    slackOfficialInteractionsPOSTSchema,
} from './slackInteractionsPOST'
import { slackOAuthRoutes } from './slackOAuth'

declare module 'fastify' {
    interface FastifyRequest {
        slackRawBody: string
        openPlannerEvent: Event
    }
}

const SLACK_CONTENT_TYPES = ['application/json', 'application/x-www-form-urlencoded']

// Cloud Functions already consumed the request stream and exposes the bytes as
// req.rawBody; the standalone dev/test server still has the live stream.
const readRawBody = (request: FastifyRequest, payload: IncomingMessage): Promise<string> => {
    const preRead = (request.raw as IncomingMessage & { rawBody?: Buffer | string }).rawBody
    if (preRead !== undefined) return Promise.resolve(preRead.toString())
    if (payload.readableEnded) return Promise.resolve('')
    return new Promise((resolve, reject) => {
        let raw = ''
        payload.setEncoding('utf8')
        payload.on('data', (chunk: string) => (raw += chunk))
        payload.on('end', () => resolve(raw))
        payload.on('error', reject)
    })
}

const parseSlackBody = (contentType: string, raw: string): unknown => {
    if (!raw) return {}
    if (contentType.startsWith('application/x-www-form-urlencoded')) {
        const payload = new URLSearchParams(raw).get('payload')
        return payload ? JSON.parse(payload) : {}
    }
    return JSON.parse(raw)
}

const registerRawBodyParsers = (fastify: FastifyInstance) => {
    for (const contentType of SLACK_CONTENT_TYPES) {
        if (fastify.hasContentTypeParser(contentType)) fastify.removeContentTypeParser(contentType)
    }
    fastify.addContentTypeParser(SLACK_CONTENT_TYPES, (request, payload, done) => {
        readRawBody(request, payload as IncomingMessage)
            .then((raw) => {
                request.slackRawBody = raw
                done(null, parseSlackBody(String(request.headers['content-type'] ?? ''), raw))
            })
            .catch((error) => done(error as Error))
    })
}

const rejectUnlessSigned = (request: FastifyRequest, reply: FastifyReply, signingSecret: string, scope: string) => {
    const valid = verifySlackSignature({
        signingSecret,
        timestamp: request.headers['x-slack-request-timestamp'] as string | undefined,
        signature: request.headers['x-slack-signature'] as string | undefined,
        rawBody: request.slackRawBody ?? '',
    })
    if (!valid) {
        console.warn('[slack] invalid signature', { scope })
        reply.status(401).send({ error: 'Invalid Slack signature' })
    }
    return valid
}

const verifyEventSlackRequest = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Params: { eventId: string } }>, reply: FastifyReply) => {
        const event = await EventDao.getEvent(fastify.firebase, request.params.eventId)
        if (!event.slackSigningSecret) {
            return reply.status(401).send({ error: 'Slack signing secret is not configured for this event' })
        }
        if (rejectUnlessSigned(request, reply, event.slackSigningSecret, event.id)) request.openPlannerEvent = event
    }
}

const verifyOfficialSlackRequest = () => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const config = getSlackAppConfig()
        if (!config) return reply.status(404).send({ error: 'Official Slack app is not configured on this server' })
        rejectUnlessSigned(request, reply, config.signingSecret, 'official')
    }
}

export const slackRoutes = (fastify: FastifyInstance, _options: unknown, done: () => void) => {
    registerRawBodyParsers(fastify)
    fastify.decorateRequest('slackRawBody', '')
    fastify.decorateRequest('openPlannerEvent', null)
    fastify.addHook('onSend', async (_request, reply) => {
        reply.header('X-Slack-No-Retry', '1')
    })

    fastify.post<{ Params: { eventId: string } }>(
        '/v1/:eventId/slack/events',
        { schema: slackEventsPOSTSchema, preHandler: verifyEventSlackRequest(fastify) },
        slackEventsRouteHandler(fastify)
    )
    fastify.post<{ Params: { eventId: string } }>(
        '/v1/:eventId/slack/interactions',
        { schema: slackInteractionsPOSTSchema, preHandler: verifyEventSlackRequest(fastify) },
        slackInteractionsRouteHandler(fastify, 'event')
    )
    fastify.post(
        '/v1/slack/events',
        { schema: slackOfficialEventsPOSTSchema, preHandler: verifyOfficialSlackRequest() },
        slackOfficialEventsRouteHandler(fastify)
    )
    fastify.post<{ Params: { eventId?: string } }>(
        '/v1/slack/interactions',
        { schema: slackOfficialInteractionsPOSTSchema, preHandler: verifyOfficialSlackRequest() },
        slackInteractionsRouteHandler(fastify, 'official')
    )
    slackOAuthRoutes(fastify)
    done()
}
