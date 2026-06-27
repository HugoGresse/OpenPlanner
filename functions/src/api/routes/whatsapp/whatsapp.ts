import { FastifyInstance } from 'fastify'
import Type, { Static } from 'typebox'
import { EventDao } from '../../dao/eventDao'

// GreenAPI universal gateway. Each instance also has its own host (e.g. https://7105.api.greenapi.com),
// but the shared gateway routes to the right instance from the id, so no per-event URL is needed.
const GREEN_API_BASE = 'https://api.green-api.com'

// A WhatsApp chatId for a person is the phone number (digits only, country code included) + "@c.us".
const toChatId = (raw: string): string => {
    const digits = raw.replace(/[^0-9]/g, '')
    return `${digits}@c.us`
}

const SendBody = Type.Object({
    to: Type.String({ description: 'Recipient phone number, international format (digits, country code included)' }),
    message: Type.String({ minLength: 1 }),
})
type SendBodyType = Static<typeof SendBody>

const SendReply = Type.Object({
    sent: Type.Boolean(),
    idMessage: Type.Optional(Type.String()),
})
type SendReplyType = Static<typeof SendReply>

export const whatsappRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<{ Params: { eventId: string }; Body: SendBodyType; Reply: SendReplyType | string }>(
        '/v1/:eventId/whatsapp/send-test',
        {
            schema: {
                tags: ['whatsapp'],
                summary: 'Send a single WhatsApp message via the event GreenAPI instance (setup test).',
                params: Type.Object({ eventId: Type.String() }),
                body: SendBody,
                response: {
                    200: SendReply,
                    400: Type.String(),
                    401: Type.String(),
                },
                security: [{ apiKey: [] }],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            const { eventId } = request.params
            const { to, message } = request.body

            const event = await EventDao.getEvent(fastify.firebase, eventId)

            const instanceId = event.greenApiInstanceId
            const token = event.greenApiToken
            if (!instanceId || !token) {
                reply.status(400).send(
                    JSON.stringify({
                        error: 'GreenAPI is not configured for this event. Set the instance id and token first.',
                    })
                )
                return
            }

            if (!to || to.replace(/[^0-9]/g, '').length < 6) {
                reply.status(400).send(JSON.stringify({ error: 'A valid recipient phone number is required.' }))
                return
            }

            const url = `${GREEN_API_BASE}/waInstance${instanceId}/sendMessage/${token}`

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId: toChatId(to), message }),
                })

                const text = await res.text()
                if (!res.ok) {
                    reply.status(400).send(
                        JSON.stringify({
                            error: 'GreenAPI rejected the request',
                            status: res.status,
                            details: text,
                        })
                    )
                    return
                }

                const data = text ? (JSON.parse(text) as { idMessage?: string }) : {}
                reply.status(200).send({ sent: true, idMessage: data.idMessage })
            } catch (err) {
                const error = err as Error
                reply.status(400).send(JSON.stringify({ error: 'Failed to reach GreenAPI', details: error.message }))
            }
        }
    )

    done()
}
