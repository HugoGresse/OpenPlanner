import { FastifyInstance } from 'fastify'
import Type, { Static } from 'typebox'
import { SessionDao } from '../../dao/sessionDao'
import { uploadBufferToStorage } from '../file/utils/uploadBufferToStorage'

const CHECK_MEDIA_MAX_URLS = 100
const CHECK_MEDIA_TIMEOUT_MS = 5000

const CheckMedia = Type.Object({
    urls: Type.Array(Type.String({ format: 'uri' }), { maxItems: CHECK_MEDIA_MAX_URLS }),
})
type CheckMediaType = Static<typeof CheckMedia>

const CheckMediaReply = Type.Object({
    results: Type.Array(
        Type.Object({
            url: Type.String(),
            ok: Type.Boolean(),
            status: Type.Optional(Type.Number()),
            error: Type.Optional(Type.String()),
        })
    ),
})

const isPrivateOrLoopbackHost = (hostname: string): boolean => {
    const lower = hostname.toLowerCase()
    if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local')) return true
    if (lower === 'metadata' || lower === 'metadata.google.internal') return true
    // IPv4 literal
    const ipv4 = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (ipv4) {
        const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
        if (a === 10) return true
        if (a === 127) return true
        if (a === 169 && b === 254) return true
        if (a === 172 && b >= 16 && b <= 31) return true
        if (a === 192 && b === 168) return true
        if (a === 0) return true
    }
    // IPv6 literal (very rough — block any literal that isn't a global unicast)
    if (lower.startsWith('[') || lower.includes(':')) {
        if (lower.includes('::1') || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) {
            return true
        }
    }
    return false
}

const checkSingleUrl = async (
    rawUrl: string
): Promise<{ url: string; ok: boolean; status?: number; error?: string }> => {
    let parsed: URL
    try {
        parsed = new URL(rawUrl)
    } catch {
        return { url: rawUrl, ok: false, error: 'Invalid URL' }
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { url: rawUrl, ok: false, error: 'Unsupported scheme' }
    }
    if (isPrivateOrLoopbackHost(parsed.hostname)) {
        return { url: rawUrl, ok: false, error: 'Private or loopback host blocked' }
    }

    const fetchWithTimeout = async (method: 'HEAD' | 'GET') => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), CHECK_MEDIA_TIMEOUT_MS)
        try {
            const res = await fetch(rawUrl, { method, signal: controller.signal })
            // Drain or cancel the body so the socket is freed.
            try {
                await res.body?.cancel()
            } catch {
                // ignore body cancel errors
            }
            return res
        } finally {
            clearTimeout(timer)
        }
    }

    try {
        const head = await fetchWithTimeout('HEAD')
        if (head.ok) return { url: rawUrl, ok: true, status: head.status }
        // Some servers don't support HEAD; only retry on the canonical "method not allowed" cases.
        if (head.status !== 405 && head.status !== 501) {
            return { url: rawUrl, ok: false, status: head.status }
        }
        const get = await fetchWithTimeout('GET')
        return { url: rawUrl, ok: get.ok, status: get.status }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { url: rawUrl, ok: false, error: message }
    }
}

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
    fastify.post<{ Body: CheckMediaType }>(
        '/v1/:eventId/check-media',
        {
            schema: {
                tags: ['sessions'],
                summary: 'Check if a list of media URLs are accessible (to avoid CORS issues from the browser).',
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
                body: CheckMedia,
                response: {
                    200: CheckMediaReply,
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
            const { urls } = request.body

            const results = await Promise.all(urls.map((url: string) => checkSingleUrl(url)))

            reply.status(200).send({ results })
        }
    )

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
