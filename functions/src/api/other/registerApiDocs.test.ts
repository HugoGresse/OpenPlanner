import { describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../setupFastify'

vi.mock('../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((_fastify, _options, next) => next()),
    }
})

type OpenApiDocument = {
    openapi: string
    components?: { securitySchemes?: Record<string, unknown> }
    paths: Record<string, Record<string, { security?: Array<Record<string, unknown>> }>>
}

describe('API docs', () => {
    const fastify = setupFastify()

    test('serves the Scalar reference at /', async () => {
        const res = await fastify.inject({ method: 'GET', url: '/' })
        expect(res.statusCode).toBe(200)
        expect(res.headers['content-type']).toContain('text/html')
        expect(res.body).toContain('openapi.json')
    })

    test('every security scheme referenced by a route is declared', async () => {
        const res = await fastify.inject({ method: 'GET', url: '/openapi.json' })
        expect(res.statusCode).toBe(200)
        const document = res.json<OpenApiDocument>()
        expect(document.openapi).toMatch(/^3\./)

        const declared = Object.keys(document.components?.securitySchemes ?? {})
        const referenced = new Set<string>()
        for (const operations of Object.values(document.paths)) {
            for (const operation of Object.values(operations)) {
                for (const requirement of operation.security ?? []) {
                    Object.keys(requirement).forEach((label) => referenced.add(label))
                }
            }
        }
        expect(referenced.size).toBeGreaterThan(0)
        for (const label of referenced) expect(declared).toContain(label)
    })
})
