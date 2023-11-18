import { onRequest } from 'firebase-functions/v2/https'
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import fastifyFirebase from '@now-ims/fastify-firebase'
import { sponsorsRoutes } from './sponsors/sponsors'
import { registerSwagger } from './swagger'
import { app as firebaseApp } from 'firebase-admin'

type Firebase = firebaseApp.App

declare module 'fastify' {
    interface FastifyInstance {
        firebase: Firebase
    }
}

const fastify = Fastify({
    logger: true,
}).withTypeProvider<TypeBoxTypeProvider>()

// For serverless compatibility
fastify.addContentTypeParser('application/json', {}, (req, body, done) => {
    // @ts-ignore
    done(null, body.body)
})

fastify.register(fastifyFirebase)
registerSwagger(fastify)

fastify.register(sponsorsRoutes)

fastify.get('/', function (request, reply) {
    reply.send({ hello: 'world ' + Date.now() })
})

fastify.listen({ port: 3000 }, function (err, address) {
    if (err) {
        fastify.log.error(err)
        process.exit(1)
    }
    // Server is now listening on ${address}
})

export const fastifyFunction = onRequest(async (request, reply) => {
    fastify.ready((error) => {
        if (error) throw error
        fastify.server.emit('request', request, reply)
    })
})
