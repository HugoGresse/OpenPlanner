import { FastifyInstance } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { SessionDao } from '../../dao/sessionDao'
import { uploadBufferToStorage } from '../file/utils/uploadBufferToStorage'

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
    frame: Type.Optional(Type.Number()),
    endpoint: Type.Optional(Type.String()),
    settings: Type.Object({
        backgroundColor: Type.String(),
        title: Type.String(),
        startingDate: Type.String(),
        logoUrl: Type.String(),
        location: Type.String(),
        speakers: Type.Array(
            Type.Object({
                pictureUrl: Type.String(),
                name: Type.String(),
                company: Type.String(),
                job: Type.String(),
            })
        ),
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
                tags: ['sessions'],
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
            const frame = request.body.frame
            const endpoint = request.body.endpoint

            const isFrameGeneration = Number.isInteger(frame)

            const baseUrl =
                endpoint === 'shortvid-official' ? 'https://api.shortvid.io' : 'https://shortvid-api.minix.gresse.io'

            const url = isFrameGeneration ? `${baseUrl}/frame/${shortVidType}/${frame}` : `${baseUrl}/${shortVidType}`

            console.log(url, shortVidSettings)

            const shortVidResponse = await fetch(url, {
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
                reply.code(500).send({ error: 'ShortVid API error, ' + shortVidResponse.statusText, success: false })
                return
            }

            // const text = await shortVidResponse.text()
            // console.log("error", text)

            const cloneResponseInCaseOfError = shortVidResponse.clone()
            const videoArrayBuffer = await shortVidResponse.arrayBuffer()
            const videoBuffer = Buffer.from(videoArrayBuffer)

            const [success, publicFileUrlOrError] = await uploadBufferToStorage(
                fastify.firebase,
                videoBuffer,
                eventId,
                'shortvid'
            )

            if (!success) {
                const text = await cloneResponseInCaseOfError.text()
                console.error('ShortVid API error', text)
                return reply.status(500).send({
                    success: false,
                    // @ts-ignore
                    error: publicFileUrlOrError + ' ' + text,
                })
            }

            if (updateSession) {
                if (isFrameGeneration) {
                    await SessionDao.updateSession(fastify.firebase, eventId, {
                        id: sessionId,
                        teaserImageUrl: publicFileUrlOrError,
                    })
                } else {
                    await SessionDao.updateSession(fastify.firebase, eventId, {
                        id: sessionId,
                        teaserVideoUrl: publicFileUrlOrError,
                    })
                }
            }
            reply.status(201).send({
                shortVidUrl: publicFileUrlOrError,
                success: true,
            })
        }
    )
    done()
}
