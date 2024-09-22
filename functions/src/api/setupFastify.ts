import { app as firebaseApp } from 'firebase-admin'
import { fastifyAuth, FastifyAuthFunction } from '@fastify/auth'
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { addContentTypeParserForServerless } from './other/addContentTypeParserForServerless'
import { firebasePlugin } from './dao/firebasePlugin'
import { apiKeyPlugin } from './apiKeyPlugin'
import cors from '@fastify/cors'
import { registerSwagger } from './swagger'
import { sponsorsRoutes } from './routes/sponsors/sponsors'
import { sessionsRoutes } from './routes/sessions/sessions'
import { faqRoutes } from './routes/faq/faq'
import { transcriptionRoutes } from './routes/transcription/transcription'
import { filesRoutes } from './routes/file/files'
import { overwriteSpeakerSessions } from './routes/overwriteSpeakerSessions/overwriteSpeakerSessions'
import { helloRoute } from './routes/hello/hello'
import { fastifyErrorHandler } from './other/fastifyErrorHandler'

type Firebase = firebaseApp.App
declare module 'fastify' {
    interface FastifyInstance {
        firebase: Firebase
        verifyApiKey: FastifyAuthFunction
    }
}

export const setupFastify = () => {
    const isDev = !!(process.env.FUNCTIONS_EMULATOR && process.env.FUNCTIONS_EMULATOR === 'true')
    const isNodeEnvDev = process.env.NODE_ENV === 'development'
    const isNodeEnvTest = process.env.NODE_ENV === 'test'

    const fastify = Fastify({
        logger: isDev,
    }).withTypeProvider<TypeBoxTypeProvider>()

    if (!isNodeEnvDev && !isNodeEnvTest) {
        addContentTypeParserForServerless(fastify)
    }

    fastify.register(fastifyAuth)
    fastify.register(firebasePlugin)
    fastify.register(apiKeyPlugin)
    fastify.register(cors, {
        origin: '*',
    })
    fastify.addHook('onSend', (_, reply, _2, done: () => void) => {
        reply.header('Cache-Control', 'must-revalidate,no-cache,no-store')
        done()
    })
    registerSwagger(fastify)

    fastify.register(sponsorsRoutes)
    fastify.register(sessionsRoutes)
    fastify.register(faqRoutes)
    fastify.register(transcriptionRoutes)
    fastify.register(filesRoutes)
    fastify.register(overwriteSpeakerSessions)
    fastify.register(helloRoute)

    fastify.setErrorHandler(fastifyErrorHandler)

    return fastify
}
