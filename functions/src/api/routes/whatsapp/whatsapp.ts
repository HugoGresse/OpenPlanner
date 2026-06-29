import { FastifyInstance } from 'fastify'
import Type, { Static } from 'typebox'
import { getFunctions } from 'firebase-admin/functions'
import { EventDao } from '../../dao/eventDao'
import { GreenApiCreds, credsFromEvent, sendMessage, sendPoll, setSettings, toChatId } from './greenApi'
import { WhatsappSenders, applyPollVotes, sendGoMessage, startTrackSession } from './trackFlow'
import { allReady, PANEL_SCHEDULE } from './trackSession'
import { WhatsappSessionDao } from './whatsappSessionDao'
import { PanelTaskPayload, sendWhatsappPanelTaskName } from './whatsappPanelTask'

// Bind the injected senders to creds so the flow code stays free of GreenAPI details.
const sendersFor = (creds: GreenApiCreds): WhatsappSenders => ({
    sendPoll: (chatId, question, options) => sendPoll(creds, chatId, question, options),
    sendMessage: (chatId, message) => sendMessage(creds, chatId, message),
})

const SendBody = Type.Object({ to: Type.String(), message: Type.String({ minLength: 1 }) })
type SendBodyType = Static<typeof SendBody>

const StartBody = Type.Object({
    chatId: Type.String({ description: 'Shared chat that receives the track poll (phone or group chatId)' }),
})
type StartBodyType = Static<typeof StartBody>

const PanelMessageBody = Type.Object({ message: Type.String({ minLength: 1 }) })
type PanelMessageBodyType = Static<typeof PanelMessageBody>

// Explicit reply schema: a bare Type.Any() makes fast-json-stringify drop every field (returns {}).
const StatusReply = Type.Object({
    chatId: Type.Union([Type.String(), Type.Null()]),
    tracks: Type.Array(Type.Object({ id: Type.String(), name: Type.String(), ready: Type.Boolean() })),
    goSent: Type.Boolean(),
})

const authMatches = (header: string, expected: string): boolean =>
    Boolean(expected) && (header === expected || header === `Bearer ${expected}`)

export const whatsappRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    // --- Test send: a single plain message to validate the GreenAPI setup ---
    fastify.post<{ Params: { eventId: string }; Body: SendBodyType }>(
        '/v1/:eventId/whatsapp/send-test',
        {
            schema: {
                tags: ['whatsapp'],
                summary: 'Send a single WhatsApp message via the event GreenAPI instance (setup test).',
                params: Type.Object({ eventId: Type.String() }),
                body: SendBody,
                response: {
                    200: Type.Object({ sent: Type.Boolean(), idMessage: Type.Optional(Type.String()) }),
                    400: Type.String(),
                    401: Type.String(),
                },
                security: [{ apiKey: [] }],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            const event = await EventDao.getEvent(fastify.firebase, request.params.eventId)
            const creds = credsFromEvent(event)
            if (!creds) {
                reply.status(400).send(JSON.stringify({ error: 'GreenAPI is not configured for this event.' }))
                return
            }
            const { to, message } = request.body
            if (!to || to.replace(/[^0-9]/g, '').length < 6) {
                reply.status(400).send(JSON.stringify({ error: 'A valid recipient phone number is required.' }))
                return
            }
            try {
                const idMessage = await sendMessage(creds, toChatId(to), message)
                reply.status(200).send({ sent: true, idMessage })
            } catch (err) {
                reply.status(400).send(JSON.stringify({ error: 'Failed to send', details: (err as Error).message }))
            }
        }
    )

    // --- Start track management: send the track poll(s) to the shared chat ---
    fastify.post<{ Params: { eventId: string }; Body: StartBodyType }>(
        '/v1/:eventId/whatsapp/track-management/start',
        {
            schema: {
                tags: ['whatsapp'],
                summary: 'Send the "which tracks are ready?" poll(s) (max 12 options each) to the shared chat.',
                params: Type.Object({ eventId: Type.String() }),
                body: StartBody,
                response: {
                    200: Type.Object({ started: Type.Boolean(), trackCount: Type.Number() }),
                    400: Type.String(),
                    401: Type.String(),
                },
                security: [{ apiKey: [] }],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            const { eventId } = request.params
            const event = await EventDao.getEvent(fastify.firebase, eventId)
            const creds = credsFromEvent(event)
            if (!creds) {
                reply.status(400).send(JSON.stringify({ error: 'GreenAPI is not configured for this event.' }))
                return
            }
            const tracks = event.tracks || []
            if (tracks.length === 0) {
                reply.status(400).send(JSON.stringify({ error: 'This event has no tracks.' }))
                return
            }
            const chatId = toChatId(request.body.chatId)
            try {
                const session = await startTrackSession(tracks, chatId, sendersFor(creds))
                await WhatsappSessionDao.saveSession(fastify.firebase, eventId, session)
                reply.status(200).send({ started: true, trackCount: tracks.length })
            } catch (err) {
                reply.status(400).send(JSON.stringify({ error: 'Failed to start', details: (err as Error).message }))
            }
        }
    )

    // --- Configure the GreenAPI instance to call our (event-scoped) webhook ---
    fastify.post<{ Params: { eventId: string }; Body: { webhookUrl: string } }>(
        '/v1/:eventId/whatsapp/configure-webhook',
        {
            schema: {
                tags: ['whatsapp'],
                summary: 'Point the GreenAPI instance at our webhook so poll votes are received (reboots instance).',
                params: Type.Object({ eventId: Type.String() }),
                body: Type.Object({ webhookUrl: Type.String() }),
                response: { 200: Type.Object({ configured: Type.Boolean() }), 400: Type.String(), 401: Type.String() },
                security: [{ apiKey: [] }],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            const event = await EventDao.getEvent(fastify.firebase, request.params.eventId)
            const creds = credsFromEvent(event)
            if (!creds) {
                reply.status(400).send(JSON.stringify({ error: 'GreenAPI is not configured for this event.' }))
                return
            }
            if (!event.apiKey) {
                reply
                    .status(400)
                    .send(JSON.stringify({ error: 'Generate an event API key first (used as the webhook token).' }))
                return
            }
            try {
                await setSettings(creds, { webhookUrl: request.body.webhookUrl, webhookUrlToken: event.apiKey })
                reply.status(200).send({ configured: true })
            } catch (err) {
                reply
                    .status(400)
                    .send(JSON.stringify({ error: 'Failed to configure webhook', details: (err as Error).message }))
            }
        }
    )

    // --- Status: current readiness, polled by the admin page ---
    fastify.get<{ Params: { eventId: string } }>(
        '/v1/:eventId/whatsapp/track-management/status',
        {
            schema: {
                tags: ['whatsapp'],
                summary: 'Current track-management readiness for the event.',
                params: Type.Object({ eventId: Type.String() }),
                response: { 200: StatusReply, 401: Type.String() },
                security: [{ apiKey: [] }],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            const session = await WhatsappSessionDao.getSession(fastify.firebase, request.params.eventId)
            reply.status(200).send(session || { chatId: null, tracks: [], goSent: false })
        }
    )

    // --- Manually broadcast the GO message once every track is ready ---
    fastify.post<{ Params: { eventId: string } }>(
        '/v1/:eventId/whatsapp/track-management/go',
        {
            schema: {
                tags: ['whatsapp'],
                summary: 'Send the GO message to the shared chat (only once every track is ready).',
                params: Type.Object({ eventId: Type.String() }),
                response: { 200: Type.Object({ sent: Type.Boolean() }), 400: Type.String(), 401: Type.String() },
                security: [{ apiKey: [] }],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            const { eventId } = request.params
            const event = await EventDao.getEvent(fastify.firebase, eventId)
            const creds = credsFromEvent(event)
            if (!creds) {
                reply.status(400).send(JSON.stringify({ error: 'GreenAPI is not configured for this event.' }))
                return
            }
            const session = await WhatsappSessionDao.getSession(fastify.firebase, eventId)
            if (!session) {
                reply.status(400).send(JSON.stringify({ error: 'No track-management session in progress.' }))
                return
            }
            if (session.goSent) {
                reply.status(400).send(JSON.stringify({ error: 'GO message was already sent.' }))
                return
            }
            if (!allReady(session.tracks)) {
                reply.status(400).send(JSON.stringify({ error: 'Not every track is ready yet.' }))
                return
            }
            try {
                const updated = await sendGoMessage(session, sendersFor(creds))
                await WhatsappSessionDao.saveSession(fastify.firebase, eventId, updated)
                reply.status(200).send({ sent: true })
            } catch (err) {
                reply.status(400).send(JSON.stringify({ error: 'Failed to send GO', details: (err as Error).message }))
                return
            }

            // Best-effort: schedule the timing reminders. GO was already broadcast, so a scheduling
            // failure here shouldn't turn into an error response — just log it.
            try {
                const taskQueue = getFunctions(fastify.firebase).taskQueue<PanelTaskPayload>(sendWhatsappPanelTaskName)
                await Promise.all(
                    PANEL_SCHEDULE.map(({ delaySeconds, message }) =>
                        taskQueue.enqueue({ eventId, message }, { scheduleDelaySeconds: delaySeconds })
                    )
                )
            } catch (err) {
                request.log?.error({ err }, 'failed to schedule whatsapp panel reminders')
            }
        }
    )

    // --- Send a free-form message to the shared chat (e.g. timing panels) ---
    fastify.post<{ Params: { eventId: string }; Body: PanelMessageBodyType }>(
        '/v1/:eventId/whatsapp/track-management/message',
        {
            schema: {
                tags: ['whatsapp'],
                summary: 'Send a free-form message (e.g. a timing panel) to the shared chat.',
                params: Type.Object({ eventId: Type.String() }),
                body: PanelMessageBody,
                response: { 200: Type.Object({ sent: Type.Boolean() }), 400: Type.String(), 401: Type.String() },
                security: [{ apiKey: [] }],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            const { eventId } = request.params
            const event = await EventDao.getEvent(fastify.firebase, eventId)
            const creds = credsFromEvent(event)
            if (!creds) {
                reply.status(400).send(JSON.stringify({ error: 'GreenAPI is not configured for this event.' }))
                return
            }
            const session = await WhatsappSessionDao.getSession(fastify.firebase, eventId)
            if (!session?.chatId) {
                reply.status(400).send(JSON.stringify({ error: 'No track-management session in progress.' }))
                return
            }
            try {
                await sendMessage(creds, session.chatId, request.body.message)
                reply.status(200).send({ sent: true })
            } catch (err) {
                reply.status(400).send(JSON.stringify({ error: 'Failed to send', details: (err as Error).message }))
            }
        }
    )

    // --- GreenAPI incoming webhook, event-scoped. GreenAPI must be configured to send an
    //     Authorization header equal to the event apiKey (raw or "Bearer <key>"). Poll votes arrive
    //     as messageData.typeMessage === "pollUpdateMessage". ---
    fastify.post<{ Params: { eventId: string } }>('/v1/:eventId/whatsapp/webhook', async (request, reply) => {
        const { eventId } = request.params
        const body = (request.body || {}) as any
        const authHeader = (request.headers['authorization'] as string | undefined) || ''

        try {
            const md = body?.messageData
            const votes: any[] = md?.pollMessageData?.votes || []
            const votedOptionNames = votes
                .filter((v) => (v?.optionVoters?.length || 0) > 0)
                .map((v) => v?.optionName)
                .filter(Boolean)

            request.log?.info(
                {
                    eventId,
                    typeWebhook: body?.typeWebhook,
                    typeMessage: md?.typeMessage,
                    votedOptionNames,
                    hasAuth: Boolean(authHeader),
                },
                'whatsapp webhook received'
            )

            if (md?.typeMessage === 'pollUpdateMessage') {
                const event = await EventDao.getEvent(fastify.firebase, eventId)
                if (!event.apiKey || !authMatches(authHeader, event.apiKey)) {
                    reply.status(401).send({ error: 'Unauthorized webhook' })
                    return
                }
                const session = await WhatsappSessionDao.getSession(fastify.firebase, eventId)
                if (session && votedOptionNames.length > 0) {
                    const updated = applyPollVotes(session, votedOptionNames)
                    await WhatsappSessionDao.saveSession(fastify.firebase, eventId, updated)
                }
            }
        } catch (err) {
            request.log?.error({ err }, 'whatsapp webhook failed')
        }

        // 200 for everything else (status pings, plain messages) so GreenAPI does not retry.
        reply.status(200).send({ received: true })
    })

    done()
}
