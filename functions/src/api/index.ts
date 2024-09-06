import './other/typeBoxAdditionalsFormats'
import { onRequest } from 'firebase-functions/v2/https'
import { setupFastify } from './setupFastify'

export const fastify = setupFastify()

export const fastifyFunction = onRequest({ timeoutSeconds: 300 }, async (request, reply) => {
    fastify.ready((error) => {
        if (error) throw error
        fastify.server.emit('request', request, reply)
    })
})
