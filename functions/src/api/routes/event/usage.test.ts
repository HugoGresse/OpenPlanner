import { beforeEach, describe, expect, test, vi } from 'vitest'
import fastify from 'fastify'
import { usageRoutes } from './usage'
import { UsageDao } from '../../dao/usageDao'

const buildApp = () => {
    const app = fastify()
    app.decorate('firebase', {} as any)
    app.decorate('auth', (handlers: any[]) => async () => {})
    app.decorate('verifyApiKey', async () => {})
    app.register(usageRoutes)
    return app
}

describe('GET /v1/:eventId/usage', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    test('returns storage and network usage', async () => {
        vi.spyOn(UsageDao, 'getStorageUsage').mockResolvedValue({
            totalBytes: 1024,
            fileCount: 2,
            topFiles: [{ name: 'a.png', sizeBytes: 1000 }],
        })
        vi.spyOn(UsageDao, 'getNetworkUsage').mockResolvedValue({
            available: true,
            days: [{ date: '2026-08-18', bytes: 500, requests: 3 }],
            totalBytes: 500,
        })

        const app = buildApp()
        const reply = await app.inject({ method: 'GET', url: '/v1/evt-1/usage?apiKey=k' })
        expect(reply.statusCode).toBe(200)
        expect(reply.json()).toEqual({
            storage: { totalBytes: 1024, fileCount: 2, topFiles: [{ name: 'a.png', sizeBytes: 1000 }] },
            network: { available: true, days: [{ date: '2026-08-18', bytes: 500, requests: 3 }], totalBytes: 500 },
        })
    })

    test('reports unavailable network usage gracefully', async () => {
        vi.spyOn(UsageDao, 'getStorageUsage').mockResolvedValue({ totalBytes: 0, fileCount: 0, topFiles: [] })
        vi.spyOn(UsageDao, 'getNetworkUsage').mockResolvedValue({ available: false, days: [], totalBytes: 0 })

        const app = buildApp()
        const reply = await app.inject({ method: 'GET', url: '/v1/evt-1/usage?apiKey=k' })
        expect(reply.statusCode).toBe(200)
        expect(reply.json().network.available).toBe(false)
    })
})
