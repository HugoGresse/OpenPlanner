import { FastifyInstance } from 'fastify'
import Type, { Static } from 'typebox'
import { EventDao } from '../../dao/eventDao'
import { GreenApiCreds, editMessage, sendInteractiveButtons, sendMessage, toChatId } from './greenApi'
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

    // --- Status: current readiness, polled by the admin page ---
    fastify.get<{ Params: { eventId: string } }>(
        '/v1/:eventId/whatsapp/track-management/status',
        {
            schema: {
                tags: ['whatsapp'],
                summary: 'Current track-management readiness for the event.',
                params: Type.Object({ eventId: Type.String() }),
                response: { 200: Type.Any(), 401: Type.String() },
                security: [{ apiKey: [] }],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            const session = await WhatsappSessionDao.getSession(fastify.firebase, request.params.eventId)
            reply.status(200).send(session || { chatId: null, tracks: [], messages: [], goSent: false })
        }
    )

    // --- GreenAPI incoming webhook (global, no eventId; mapped via instance id). No apiKey: GreenAPI
    //     calls it. It only acts on a button reply that matches a known event + session. ---
    fastify.post('/v1/whatsapp/webhook', async (request, reply) => {
        const body = (request.body || {}) as any

        // Always 200 quickly so GreenAPI does not retry; do the work but never surface internals.
        try {
            const instanceId = body?.instanceData?.idInstance
            const selectedButtonId =
                body?.messageData?.interactiveButtonsReply?.buttonId ||
                body?.messageData?.interactiveButtonsReply?.selectedButtonId ||
                body?.messageData?.buttonsResponseMessage?.selectedButtonId ||
                body?.messageData?.templateButtonReplyMessage?.selectedId

            if (instanceId && selectedButtonId) {
                const found = await WhatsappSessionDao.findEventByInstanceId(fastify.firebase, String(instanceId))
                const creds = found && credsFromEvent(found.event)
                if (found && creds) {
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

        reply.status(200).send({ received: true })
    })

    done()
}
