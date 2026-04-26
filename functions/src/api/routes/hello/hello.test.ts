import { describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((_fastify, _options, next) => next()),
    }
})

describe('GET /hello', () => {
    const fastify = setupFastify()

    test('returns hello world payload', async () => {
        const res = await fastify.inject({ method: 'get', url: '/hello' })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body).hello).toMatch(/^world /)
    })
})
