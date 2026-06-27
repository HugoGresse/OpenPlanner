import { FastifyInstance } from 'fastify'
import Type, { Static } from 'typebox'
import { EventDao } from '../../dao/eventDao'
import { GreenApiCreds, editMessage, sendInteractiveButtons, sendMessage, setSettings, toChatId } from './greenApi'
import { WhatsappSenders, handleTrackReady, startTrackSession } from './trackFlow'
import { WhatsappSessionDao } from './whatsappSessionDao'

const credsFromEvent = (event: {
    greenApiInstanceId?: string | null
    greenApiToken?: string | null
}): GreenApiCreds | null => {
    if (!event.greenApiInstanceId || !event.greenApiToken) return null
    return { instanceId: event.greenApiInstanceId, token: event.greenApiToken }
}

// Bind the injected senders to a chat + creds so the flow code stays free of GreenAPI details.
const sendersFor = (creds: GreenApiCreds): WhatsappSenders => ({
    sendInteractiveButtons: (chatId, body, buttons) => sendInteractiveButtons(creds, chatId, body, buttons),
    editMessage: (chatId, idMessage, message) => editMessage(creds, chatId, idMessage, message),
    sendMessage: (chatId, message) => sendMessage(creds, chatId, message),
})

const SendBody = Type.Object({
    to: Type.String(),
    message: Type.String({ minLength: 1 }),
})
type SendBodyType = Static<typeof SendBody>

const StartBody = Type.Object({
    chatId: Type.String({ description: 'Shared chat that receives the track buttons (phone or group chatId)' }),
})
type StartBodyType = Static<typeof StartBody>

// Explicit reply schema: a bare Type.Any() makes fast-json-stringify drop every field (returns {}).
const StatusReply = Type.Object({
    chatId: Type.Union([Type.String(), Type.Null()]),
    tracks: Type.Array(Type.Object({ id: Type.String(), name: Type.String(), ready: Type.Boolean() })),
    messages: Type.Array(Type.Object({ idMessage: Type.String(), trackIds: Type.Array(Type.String()) })),
    goSent: Type.Boolean(),
})

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

    // --- Start track management: send chunked interactive button messages to the shared chat ---
    fastify.post<{ Params: { eventId: string }; Body: StartBodyType }>(
        '/v1/:eventId/whatsapp/track-management/start',
        {
            schema: {
                tags: ['whatsapp'],
                summary: 'Send the per-track "ready?" interactive buttons (max 3 per message) to the shared chat.',
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

    // --- Configure the GreenAPI instance to call our webhook (URL + auth token + incoming on) ---
    fastify.post<{ Params: { eventId: string }; Body: { webhookUrl: string } }>(
        '/v1/:eventId/whatsapp/configure-webhook',
        {
            schema: {
                tags: ['whatsapp'],
                summary: 'Point the GreenAPI instance at our webhook so button taps are received (reboots instance).',
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
                // webhookUrlToken = apiKey, so GreenAPI sends "Authorization: Bearer <apiKey>" we verify below.
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
            reply.status(200).send(session || { chatId: null, tracks: [], messages: [], goSent: false })
        }
    )

    // --- GreenAPI incoming webhook (global, no eventId; mapped via instance id). GreenAPI must be
    //     configured to send an Authorization header equal to the event apiKey (raw or "Bearer <key>")
    //     so forged button presses are rejected. ---
    fastify.post('/v1/whatsapp/webhook', async (request, reply) => {
        const body = (request.body || {}) as any
        const authHeader = (request.headers['authorization'] as string | undefined) || ''

        try {
            const instanceId = body?.instanceData?.idInstance
            const selectedButtonId =
                body?.messageData?.interactiveButtonsReply?.buttonId ||
                body?.messageData?.interactiveButtonsReply?.selectedButtonId ||
                body?.messageData?.buttonsResponseMessage?.selectedButtonId ||
                body?.messageData?.templateButtonReplyMessage?.selectedId

            // Log every call so a "press did nothing" can be traced: did GreenAPI call us, with what
            // type, did we extract a button id, was the auth header present.
            request.log?.info(
                {
                    typeWebhook: body?.typeWebhook,
                    typeMessage: body?.messageData?.typeMessage,
                    instanceId,
                    selectedButtonId,
                    hasAuth: Boolean(authHeader),
                },
                'whatsapp webhook received'
            )

            if (instanceId && selectedButtonId) {
                const found = await WhatsappSessionDao.findEventByInstanceId(fastify.firebase, String(instanceId))
                const expected = found?.event.apiKey || ''

                // Reject anything that doesn't carry the event's secret in the Authorization header.
                if (!found || !expected || (authHeader !== expected && authHeader !== `Bearer ${expected}`)) {
                    reply.status(401).send({ error: 'Unauthorized webhook' })
                    return
                }

                const creds = credsFromEvent(found.event)
                if (creds) {
                    const session = await WhatsappSessionDao.getSession(fastify.firebase, found.id)
                    if (session) {
                        const updated = await handleTrackReady(session, String(selectedButtonId), sendersFor(creds))
                        await WhatsappSessionDao.saveSession(fastify.firebase, found.id, updated)
                    }
                }
            }
        } catch (err) {
            request.log?.error({ err }, 'whatsapp webhook failed')
        }

        // 200 for non-button events (status updates, plain messages) so GreenAPI does not retry them.
        reply.status(200).send({ received: true })
    })

    done()
}
