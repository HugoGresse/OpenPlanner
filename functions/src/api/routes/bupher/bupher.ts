import { FastifyInstance } from 'fastify'
import { Static, Type } from '@sinclair/typebox'

const BupherLoginBody = Type.Object({
    email: Type.String(),
    password: Type.String(),
})

type BupherLoginBodyType = Static<typeof BupherLoginBody>

const BupherLoginReply = Type.Object({
    success: Type.Boolean(),
    error: Type.Optional(Type.String()),
    cookies: Type.Optional(Type.String()),
})

type BupherLoginReplyType = Static<typeof BupherLoginReply>

const browserHeaders = {
    'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    Origin: 'https://login.bu' + 'f' + 'f' + 'er' + '.com',
    Referer: 'https://login.bu' + 'f' + 'f' + 'er' + '.com/login',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
}

const BASE_URL = 'https://login.bu' + 'f' + 'f' + 'er' + '.com'

export const bupherRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<{ Body: BupherLoginBodyType; Reply: BupherLoginReplyType }>(
        '/v1/:eventId/bupher/login',
        {
            schema: {
                tags: ['bupher'],
                summary: 'Login to Bupher using credentials',
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
                body: BupherLoginBody,
                response: {
                    200: BupherLoginReply,
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
            try {
                const { email, password } = request.body

                // Fetch the login page
                const loginPageResponse = await fetch(`${BASE_URL}/login`, {
                    headers: {
                        ...browserHeaders,
                        'Sec-Fetch-Site': 'none',
                    },
                })
                if (!loginPageResponse.ok) {
                    return reply.code(500).send({
                        success: false,
                        error: 'Failed to fetch Bupher login page',
                    })
                }

                // Get the HTML content
                const htmlContent = await loginPageResponse.text()

                // Extract CSRF token from the HTML
                const csrfMatch = htmlContent.match(/<input[^>]*name="_csrf"[^>]*value="([^"]*)"/)
                if (!csrfMatch) {
                    return reply.code(500).send({
                        success: false,
                        error: 'Could not extract CSRF token',
                    })
                }
                const csrfToken = csrfMatch[1]

                // Get cookies from the login page response and format them properly
                const rawCookies = loginPageResponse.headers.get('set-cookie')
                const cookies = rawCookies
                    ?.split(',')
                    .map((cookie) => cookie.split(';')[0])
                    .join('; ')

                // Submit login form with CSRF token
                const loginResponse = await fetch(`${BASE_URL}/login`, {
                    method: 'POST',
                    headers: {
                        ...browserHeaders,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Cookie: cookies || '',
                    },
                    body: new URLSearchParams({
                        _csrf: csrfToken,
                        email: email,
                        password: password,
                    }).toString(),
                    redirect: 'follow',
                })

                console.log('Bupher login response:', loginResponse.statusText, loginResponse.status)

                if (!loginResponse.ok) {
                    return reply.code(401).send({
                        success: false,
                        error: 'Invalid credentials or login failed',
                    })
                }

                // Get the cookies from the successful login response
                const loginCookies = loginResponse.headers.get('set-cookie')

                reply.send({
                    success: true,
                    cookies: loginCookies || undefined,
                })
            } catch (error) {
                console.error('Bupher login error:', error)
                reply.code(500).send({
                    success: false,
                    error: 'Internal server error during Bupher login',
                })
            }
        }
    )
    done()
}
