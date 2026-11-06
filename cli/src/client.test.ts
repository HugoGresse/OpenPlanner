import { describe, expect, test, vi } from 'vitest'
import { ApiError, buildUrl, createClient, fillPath, redactUrl } from './client.js'

describe('fillPath', () => {
    test('replaces and encodes the event id', () => {
        expect(fillPath('/v1/{eventId}/sessions', 'a b')).toBe('/v1/a%20b/sessions')
    })
    test('throws without event id when needed', () => {
        expect(() => fillPath('/v1/{eventId}/sessions')).toThrow(/No event id/)
        expect(fillPath('/v1/slack/config')).toBe('/v1/slack/config')
    })
})

describe('buildUrl', () => {
    test('keeps a base path, adds query and apiKey, skips undefined', () => {
        expect(
            buildUrl(
                'http://localhost:5001/p/europe-west1/api',
                '/v1/e/sessions',
                { limit: 10, trackId: undefined },
                'key'
            )
        ).toBe('http://localhost:5001/p/europe-west1/api/v1/e/sessions?limit=10&apiKey=key')
    })
})

test('redactUrl masks the api key only', () => {
    expect(redactUrl('https://api.test/v1/e/sessions?limit=1&apiKey=SECRET')).toBe(
        'https://api.test/v1/e/sessions?limit=1&apiKey=***'
    )
    expect(redactUrl('https://api.test/hello')).toBe('https://api.test/hello')
})

describe('createClient', () => {
    const settings = { apiUrl: 'https://api.test', eventId: 'evt', apiKey: 'k', profile: 'default' }

    test('sends JSON and parses JSON', async () => {
        const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
        const client = createClient(settings, fetchMock as unknown as typeof fetch)
        await expect(
            client.request({ method: 'PATCH', path: '/v1/{eventId}/event', body: { name: 'x' } })
        ).resolves.toEqual({ ok: true })
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
        expect(url).toBe('https://api.test/v1/evt/event?apiKey=k')
        expect(init.method).toBe('PATCH')
        expect((init.headers as Record<string, string>)['content-type']).toBe('application/json')
        expect(init.body).toBe('{"name":"x"}')
    })

    test('errors become ApiError with a redacted url', async () => {
        const fetchMock = vi.fn(async () => new Response('{"error":"nope"}', { status: 401 }))
        const client = createClient(settings, fetchMock as unknown as typeof fetch)
        const promise = client.request({ method: 'GET', path: '/v1/{eventId}/sessions' })
        await expect(promise).rejects.toBeInstanceOf(ApiError)
        await expect(promise).rejects.toMatchObject({
            status: 401,
            message: 'nope',
            url: 'https://api.test/v1/evt/sessions?apiKey=***',
        })
    })

    test('public routes skip the api key', async () => {
        const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
        const client = createClient({ ...settings, apiKey: undefined }, fetchMock as unknown as typeof fetch)
        await client.request({ method: 'GET', path: '/v1/{eventId}/event', auth: false })
        expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('https://api.test/v1/evt/event')
    })

    test('missing api key is reported before any request', async () => {
        const fetchMock = vi.fn()
        const client = createClient({ ...settings, apiKey: undefined }, fetchMock as unknown as typeof fetch)
        await expect(client.request({ method: 'GET', path: '/v1/{eventId}/sessions' })).rejects.toThrow(/No API key/)
        expect(fetchMock).not.toHaveBeenCalled()
    })
})
