import { expect, test, describe } from 'vitest'
import { setupFastify } from './setupFastify'

describe('API base 404 + swagger', () => {
    let fastify: any = setupFastify()

    test('API reference is served on API root', async () => {
        const res = await fastify.inject({ method: 'get', url: '/' })
        expect(res.statusCode).to.equal(200)
        expect(res.headers['content-type']).to.contain('text/html')
    })
    test('404 on non existing route', async () => {
        const res = await fastify.inject({ method: 'get', url: '/non-existing-route' })
        expect(res.statusCode).to.equal(404)
        const body = JSON.parse(res.body)
        expect(body).toMatchObject({
            message: 'Route GET:/non-existing-route not found',
            error: 'Not Found',
            statusCode: 404,
        })
    })
})
