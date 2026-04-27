import './other/typeBoxAdditionalsFormats'
import fb, { credential } from 'firebase-admin'
import { onRequest } from 'firebase-functions/v2/https'
import { EventDao } from './dao/eventDao'
import {
    EngineMessage,
    EngineRole,
    MAX_CONTENT_LENGTH,
    MAX_MESSAGES,
    runChatStream,
} from './routes/chat/chatStreamEngine'

// Reuse a single Firebase Admin app between cold starts of the function.
let cachedApp: fb.app.App | null = null
const getFirebaseApp = (): fb.app.App => {
    if (cachedApp) return cachedApp
    const cert = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string)
        : undefined
    const appConfig = {
        credential: cert ? credential.cert(cert) : fb.credential.applicationDefault(),
    }
    const existing = fb.apps.find((a) => a?.name === 'chat-stream') as fb.app.App | undefined
    cachedApp = existing ?? fb.initializeApp(appConfig, 'chat-stream')
    return cachedApp
}

const ALLOWED_ROLES: EngineRole[] = ['user', 'assistant', 'system']

const validateBody = (
    body: unknown
): { ok: true; messages: EngineMessage[]; model?: string } | { ok: false; status: number; error: string } => {
    if (!body || typeof body !== 'object') {
        return { ok: false, status: 400, error: 'Body must be a JSON object' }
    }
    const b = body as Record<string, unknown>
    const rawMessages = b.messages
    if (!Array.isArray(rawMessages)) {
        return { ok: false, status: 400, error: 'messages must be an array' }
    }
    if (rawMessages.length < 1 || rawMessages.length > MAX_MESSAGES) {
        return { ok: false, status: 400, error: `messages must have between 1 and ${MAX_MESSAGES} entries` }
    }
    const messages: EngineMessage[] = []
    for (let i = 0; i < rawMessages.length; i++) {
        const m = rawMessages[i] as { role?: unknown; content?: unknown }
        if (!m || typeof m !== 'object') return { ok: false, status: 400, error: `messages[${i}] must be an object` }
        if (typeof m.role !== 'string' || !ALLOWED_ROLES.includes(m.role as EngineRole)) {
            return { ok: false, status: 400, error: `messages[${i}].role is invalid` }
        }
        if (typeof m.content !== 'string') {
            return { ok: false, status: 400, error: `messages[${i}].content must be a string` }
        }
        if (m.content.length > MAX_CONTENT_LENGTH) {
            return { ok: false, status: 400, error: `messages[${i}].content exceeds ${MAX_CONTENT_LENGTH} chars` }
        }
        messages.push({ role: m.role as EngineRole, content: m.content })
    }
    let model: string | undefined
    if (b.model !== undefined) {
        if (typeof b.model !== 'string' || b.model.length > 200) {
            return { ok: false, status: 400, error: 'model must be a string up to 200 chars' }
        }
        model = b.model
    }
    return { ok: true, messages, model }
}

const sendJson = (res: any, requestOrigin: string, status: number, body: unknown) => {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', requestOrigin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Vary', 'Origin')
    res.status(status).send(JSON.stringify(body))
}

const parseEventIdFromUrl = (rawUrl: string | undefined): string | null => {
    if (!rawUrl) return null
    // Hosting rewrites strip the host and forward the path. Accept either
    // `/v1/<id>/chat` or `/<eventId>` style URLs and pull the segment after `v1/`.
    const match = rawUrl.match(/\/v1\/([^/?#]+)\/chat(?:[/?#].*)?$/)
    return match ? decodeURIComponent(match[1]) : null
}

export const chatStream = onRequest(
    {
        timeoutSeconds: 540,
        region: 'europe-west1',
        memory: '512MiB',
        // Required for Cloud Functions gen2 streaming responses (the function
        // runs in CPU-always-allocated mode so chunks don't get withheld).
        cpu: 1,
        cors: true,
    },
    async (req, res) => {
        const requestOrigin = (req.headers.origin as string | undefined) || '*'

        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', requestOrigin)
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
            res.setHeader('Access-Control-Allow-Credentials', 'true')
            res.setHeader('Vary', 'Origin')
            res.status(204).send('')
            return
        }

        if (req.method !== 'POST') {
            sendJson(res, requestOrigin, 405, { error: 'Method not allowed' })
            return
        }

        const eventId = parseEventIdFromUrl(req.url) ?? parseEventIdFromUrl(req.originalUrl)
        if (!eventId) {
            sendJson(res, requestOrigin, 400, { error: 'Missing eventId in URL' })
            return
        }

        const apiKey = (req.query?.apiKey as string | undefined) || ''
        if (!apiKey) {
            sendJson(res, requestOrigin, 401, { error: 'Unauthorized! Du balai !' })
            return
        }

        const validated = validateBody(req.body)
        if (!validated.ok) {
            sendJson(res, requestOrigin, validated.status, { error: validated.error })
            return
        }

        const firebaseApp = getFirebaseApp()

        let event
        try {
            event = await EventDao.getEvent(firebaseApp, eventId)
        } catch (error) {
            sendJson(res, requestOrigin, 404, {
                error: `Event not found: ${error instanceof Error ? error.message : 'Unknown error'}`,
            })
            return
        }

        if (event.apiKey !== apiKey) {
            sendJson(res, requestOrigin, 401, { error: 'Unauthorized! Du balai !' })
            return
        }

        // Stream response. Bypassing Express body buffering — we own (req, res) directly.
        res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Content-Encoding': 'identity',
            'X-Accel-Buffering': 'no',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': requestOrigin,
            'Access-Control-Allow-Credentials': 'true',
            Vary: 'Origin',
        })
        try {
            ;(res as any).socket?.setNoDelay(true)
        } catch {
            /* noop */
        }
        // 2 KB padding to push past any intermediate proxy's first-write buffer.
        res.write(`: ${' '.repeat(2048)}\n\n`)

        try {
            await runChatStream({
                firebaseApp,
                eventId,
                messages: validated.messages,
                model: validated.model,
                onEvent: (data) => {
                    res.write(`data: ${JSON.stringify(data)}\n\n`)
                },
            })
            res.write('data: [DONE]\n\n')
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error'
            try {
                res.write(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`)
            } catch {
                /* socket may already be detached */
            }
        } finally {
            try {
                res.end()
            } catch {
                /* noop */
            }
        }
    }
)
