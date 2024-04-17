import { FastifyInstance } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { SessionDao } from '../../dao/sessionDao'

/**
 *
 *     backgroundColor: string
 *     title: string
 *     startingDate: string
 *     logoUrl: string
 *     location: string | null
 *     speaker: {
 *         pictureUrl: string
 *         name: string
 *         company: string
 *         job: string | null
 *     }
 *
 */
const ShortVid = Type.Object({
    shortVidType: Type.String(),
    updateSession: Type.Boolean(),
    settings: Type.Object({
        backgroundColor: Type.String(),
        title: Type.String(),
        startingDate: Type.String(),
        logoUrl: Type.String(),
        location: Type.String(),
        speaker: Type.Object({
            pictureUrl: Type.String(),
            name: Type.String(),
            company: Type.String(),
            job: Type.String(),
        }),
    }),
})

type ShortVidType = Static<typeof ShortVid>

const ShortVidReply = Type.Object({
    shortVidUrl: Type.String(),
    success: Type.Boolean(),
})
type ShortVidReplyType = Static<typeof ShortVidReply>

export const sessionsRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<{ Body: ShortVidType; Reply: ShortVidReplyType }>(
        '/v1/:eventId/sessions/:sessionId/shortvid',
        {
            schema: {
                tags: ['session'],
                summary: 'Generate the session announcement video using shortvid.io API.',
                querystring: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        apiKey: {
                            type: 'string',
                            description: 'The API key of the event',
                        },
                    },
                },
                body: ShortVid,
                response: {
                    201: ShortVidReply,
                    400: Type.Object({
                        error: Type.String(),
                    }),
                },
                security: [
                    {
                        apiKey: [],
                    },
                ],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            const { eventId, sessionId } = request.params as { eventId: string; sessionId: string }

            if (!sessionId || sessionId.length === 0) {
                reply.code(400).send({
                    // @ts-ignore
                    error: "Bad Request! Missing sessionId, hophop let's get to work!",
                    success: false,
                })
                return
            }

            const updateSession = request.body.updateSession
            const shortVidType = request.body.shortVidType
            const shortVidSettings = request.body.settings

            const shortVidResponse = await fetch(`https://api.shortvid.io/${shortVidType}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                referrer: `https://openplanner.fr/${eventId}`,
                body: JSON.stringify({
                    ...shortVidSettings,
                }),
            })

            if (!shortVidResponse.ok) {
                // @ts-ignore
                reply.code(400).send({ error: 'ShortVid API error, ' + shortVidResponse.statusText, success: false })
                return
            }

            const blobData = await shortVidResponse.blob()
            const shortVidUrl = URL.createObjectURL(blobData)

            // TODO : store the data... it's not really an url

            if (updateSession) {
                await SessionDao.updateSession(fastify.firebase, eventId, {
                    id: sessionId,
                    teaserUrl: shortVidUrl,
                })
            }
            reply.status(201).send({
                shortVidUrl: shortVidUrl,
                success: true,
            })
        }
    )
    done()
}
