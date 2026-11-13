import { describe, expect, test } from 'vitest'
import Fastify from 'fastify'
import { addContentTypeParserForServerless } from './addContentTypeParserForServerless'

const build = () => {
    const fastify = Fastify()
    addContentTypeParserForServerless(fastify)
    fastify.post('/echo', async (request) => ({ received: request.body }))
    return fastify
}

describe('addContentTypeParserForServerless', () => {
    test('uses the Express-pre-parsed body when present', async () => {
        const fastify = build()
        fastify.addHook('onRequest', async (request) => {
            ;(request.raw as unknown as { body: unknown }).body = { fromExpress: true }
        })
        const res = await fastify.inject({ method: 'POST', url: '/echo', payload: { ignored: 1 } })
        expect(res.json()).toEqual({ received: { fromExpress: true } })
    })

    test('parses the stream for injected requests (no pre-parsed body)', async () => {
        const fastify = build()
        const res = await fastify.inject({ method: 'POST', url: '/echo', payload: { name: 'Alicia' } })
        expect(res.json()).toEqual({ received: { name: 'Alicia' } })
    })
})
