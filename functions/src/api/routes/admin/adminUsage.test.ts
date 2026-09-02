import { describe, expect, test, vi } from 'vitest'
import fastify from 'fastify'
import { adminUsageRoutes } from './adminUsage'
import { UsageDao } from '../../dao/usageDao'

const buildApp = (allowed: boolean) => {
    const app = fastify()
    app.decorate('firebase', {} as any)
    app.decorate('auth', (handlers: any[]) => async (request: any, reply: any) => {
        for (const handler of handlers) await handler(request, reply)
    })
    app.decorate('verifySuperAdmin', async (request: any, reply: any) => {
        if (!allowed) reply.code(403).send({ error: 'Not a super admin' })
    })
    app.register(adminUsageRoutes)
    return app
}

describe('GET /v1/admin/usage', () => {
    test('returns the global usage for a super admin', async () => {
        vi.spyOn(UsageDao, 'getGlobalUsage').mockResolvedValue({
            totalStorageBytes: 2048,
            totalFileCount: 4,
            networkAvailable: true,
            totalNetworkBytes: 999,
            networkDays: [{ date: '2026-08-18', bytes: 999, requests: 12 }],
            events: [{ eventId: 'e1', storageBytes: 2048, fileCount: 4, networkBytes: 999, networkRequests: 12 }],
        })
        const reply = await buildApp(true).inject({ method: 'GET', url: '/v1/admin/usage' })
        expect(reply.statusCode).toBe(200)
        expect(reply.json().events[0].eventId).toBe('e1')
        expect(reply.json().totalNetworkBytes).toBe(999)
    })

    test('rejects non super admins', async () => {
        const reply = await buildApp(false).inject({ method: 'GET', url: '/v1/admin/usage' })
        expect(reply.statusCode).toBe(403)
    })
})
