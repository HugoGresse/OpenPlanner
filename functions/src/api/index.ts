import { onRequest } from 'firebase-functions/v2/https'
import Fastify from 'fastify'
import { fastifyAuth, FastifyAuthFunction } from '@fastify/auth'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { registerSwagger } from './swagger'
import { app as firebaseApp } from 'firebase-admin'
import cors from '@fastify/cors'
import { firebasePlugin } from './dao/firebasePlugin'

import { fastifyErrorHandler } from './other/fastifyErrorHandler'
import { addContentTypeParserForServerless } from './other/addContentTypeParserForServerless'
import { apiKeyPlugin } from './apiKeyPlugin'

import { sponsorsRoutes } from './routes/sponsors/sponsors'
import { filesRoutes } from './routes/file/files'
import { faqRoutes } from './routes/faq/faq'
import { helloRoute } from './routes/hello/hello'
import { sessionsRoutes } from './routes/sessions/sessions'
import { transcriptionRoutes } from './routes/transcription/transcription'

type Firebase = firebaseApp.App

declare module 'fastify' {
    interface FastifyInstance {
        firebase: Firebase
        verifyApiKey: FastifyAuthFunction
    }
}

const isDev = !!(process.env.FUNCTIONS_EMULATOR && process.env.FUNCTIONS_EMULATOR === 'true')
const isNodeEnvDev = process.env.NODE_ENV === 'development'

const fastify = Fastify({
    logger: isDev,
}).withTypeProvider<TypeBoxTypeProvider>()

if (!isNodeEnvDev) {
    addContentTypeParserForServerless(fastify)
}

fastify.register(fastifyAuth)
fastify.register(firebasePlugin)
fastify.register(apiKeyPlugin)
fastify.register(cors, {
    origin: '*',
})
registerSwagger(fastify)

fastify.register(sponsorsRoutes)
fastify.register(sessionsRoutes)
fastify.register(faqRoutes)
fastify.register(transcriptionRoutes)
fastify.register(filesRoutes)
fastify.register(helloRoute)

fastify.setErrorHandler(fastifyErrorHandler)

if (isNodeEnvDev) {
    fastify.listen({ port: 3000 }, function (err, address) {
        if (err) {
            fastify.log.error(err)
            console.error('error starting fastify server', err)
            process.exit(1)
        }
        // Server is now listening on ${address}
        console.log('listening :3000')
    })
} else {
    console.log("Running in production mode, don't listen")
}

export const fastifyFunction = onRequest({ timeoutSeconds: 300 }, async (request, reply) => {
    fastify.ready((error) => {
        if (error) throw error
        fastify.server.emit('request', request, reply)
    })
})
