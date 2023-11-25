import { onRequest } from 'firebase-functions/v2/https'
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { registerSwagger } from './swagger'
import { app as firebaseApp } from 'firebase-admin'
import { firebasePlugin } from './dao/firebasePlugin'

import { sponsorsRoutes } from './sponsors/sponsors'
import { filesRoutes } from './file/files'

type Firebase = firebaseApp.App

declare module 'fastify' {
    interface FastifyInstance {
        firebase: Firebase
    }
}

const isDev = !!(process.env.FUNCTIONS_EMULATOR && process.env.FUNCTIONS_EMULATOR === 'true')
const isNodeEnvDev = process.env.NODE_ENV === 'development'

const fastify = Fastify({
    logger: isDev,
}).withTypeProvider<TypeBoxTypeProvider>()

if (!isNodeEnvDev) {
    // For serverless compatibility
    fastify.addContentTypeParser('application/json', {}, (req, body, done) => {
        done(null, (body as any).body)
    })
    fastify.addContentTypeParser('multipart/form-data', {}, (req, body, done) => {
        done(null, req)
    })
}

fastify.register(firebasePlugin)
registerSwagger(fastify)

fastify.register(sponsorsRoutes)
fastify.register(filesRoutes)

fastify.get('/hello', function (request, reply) {
    reply.send({ hello: 'world ' + Date.now() })
})

if (isNodeEnvDev) {
    fastify.listen({ port: 3000 }, function (err, address) {
        if (err) {
            fastify.log.error(err)
            process.exit(1)
        }
        // Server is now listening on ${address}
        console.log('listening :3000')
    })
} else {
    console.log("Running in production mode, don't listen")
}

export const fastifyFunction = onRequest(async (request, reply) => {
    fastify.ready((error) => {
        if (error) throw error
        fastify.server.emit('request', request, reply)
    })
})
