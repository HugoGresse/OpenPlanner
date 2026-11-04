import { Settings } from './config.js'

export type Query = Record<string, string | number | boolean | undefined>

export type RequestOptions = {
    method: string
    path: string
    query?: Query
    body?: unknown
    form?: FormData
    headers?: Record<string, string>
    auth?: boolean
}

export class ApiError extends Error {
    constructor(public readonly status: number, public readonly body: unknown, public readonly url: string) {
        super(typeof body === 'string' ? body : (body as { error?: string })?.error || `HTTP ${status}`)
        this.name = 'ApiError'
    }
}

const MISSING_EVENT =
    'No event id. Pass --event <id>, set OPENPLANNER_EVENT_ID, or run `openplanner config set -e <eventId> -k <apiKey>`.'
const MISSING_KEY =
    'No API key. Pass --api-key <key>, set OPENPLANNER_API_KEY, or run `openplanner config set -e <eventId> -k <apiKey>`. The key is on the event "Integration & API" page.'

export const fillPath = (path: string, eventId?: string): string => {
    if (!path.includes('{eventId}')) return path
    if (!eventId) throw new Error(MISSING_EVENT)
    return path.replaceAll('{eventId}', encodeURIComponent(eventId))
}

export const buildUrl = (apiUrl: string, path: string, query: Query = {}, apiKey?: string): string => {
    const url = new URL(path.startsWith('/') ? path.slice(1) : path, apiUrl.endsWith('/') ? apiUrl : apiUrl + '/')
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value))
    }
    if (apiKey) url.searchParams.set('apiKey', apiKey)
    return url.href
}

export const redactUrl = (href: string): string => {
    const url = new URL(href)
    if (url.searchParams.has('apiKey')) url.searchParams.set('apiKey', '***')
    return url.href
}

const parseBody = async (response: Response): Promise<unknown> => {
    const text = await response.text()
    if (!text) return null
    try {
        return JSON.parse(text)
    } catch {
        return text
    }
}

export type ApiClient = ReturnType<typeof createClient>

export const createClient = (settings: Settings, fetchImpl: typeof fetch = fetch) => {
    const url = (options: Pick<RequestOptions, 'path' | 'query' | 'auth'>) => {
        const needsKey = options.auth !== false
        if (needsKey && !settings.apiKey) throw new Error(MISSING_KEY)
        const path = fillPath(options.path, settings.eventId)
        return buildUrl(settings.apiUrl, path, options.query, needsKey ? settings.apiKey : undefined)
    }

    const send = async (options: RequestOptions): Promise<Response> => {
        const headers: Record<string, string> = { accept: 'application/json', ...options.headers }
        let body: BodyInit | undefined
        if (options.form) body = options.form
        else if (options.body !== undefined) {
            headers['content-type'] = 'application/json'
            body = JSON.stringify(options.body)
        }
        const target = url(options)
        const response = await fetchImpl(target, { method: options.method, headers, body })
        if (!response.ok) throw new ApiError(response.status, await parseBody(response), redactUrl(target))
        return response
    }

    const request = async <T = unknown>(options: RequestOptions): Promise<T> =>
        parseBody(await send(options)) as Promise<T>

    const stream = async (options: RequestOptions): Promise<ReadableStream<Uint8Array>> => {
        const response = await send({ ...options, headers: { accept: 'text/event-stream', ...options.headers } })
        if (!response.body) throw new ApiError(response.status, 'Empty response body', redactUrl(url(options)))
        return response.body
    }

    return { request, stream, url }
}
