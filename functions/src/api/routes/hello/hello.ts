import { FastifyInstance } from 'fastify'

export const helloRoute = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.get('/hello', function (request, reply) {
        reply.send({ hello: 'world ' + Date.now() })
    })
    done()
}
