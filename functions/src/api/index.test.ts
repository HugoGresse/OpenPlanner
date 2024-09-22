import { expect, test, describe } from 'vitest'
import { setupFastify } from './setupFastify'

describe('API base 404 + swagger', () => {
    let fastify: any = setupFastify()

    test('Swagger is present on API root', async () => {
        const res = await fastify.inject({ method: 'get', url: '/' })
        expect(res.statusCode).to.equal(302)
        expect(res.headers.location).to.equal('./static/index.html')
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
