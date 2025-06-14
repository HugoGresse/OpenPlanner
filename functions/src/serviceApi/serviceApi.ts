import { onRequest } from 'firebase-functions/v2/https'
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { addContentTypeParserForServerless } from '../api/other/addContentTypeParserForServerless'
import { pdfRoute } from './pdf'
import { fastifyErrorHandler } from '../api/other/fastifyErrorHandler'
import cors from '@fastify/cors'
import { noCacheHook } from '../fastifyUtils/noCacheHook'
import FastifySwagger from '@fastify/swagger'
import FastifySwaggerUi from '@fastify/swagger-ui'
import { serviceApiKeyPlugin } from './apiKeyPreHandler'
import { fastifyAuth, FastifyAuthFunction } from '@fastify/auth'

declare module 'fastify' {
    interface FastifyInstance {
        verifyServiceApiKey: FastifyAuthFunction
    }
}

const setupServiceFastify = () => {
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
    fastify.register(serviceApiKeyPlugin)
    fastify.register(cors, {
        origin: '*',
    })
    fastify.register(FastifySwagger, {
        swagger: {
            info: {
                title: 'OpenPlanner Service API Documentation',
                version: '1.0.0',
            },
            host: isDev ? 'localhost:5001/conferencecenterr/europe-west1/serviceApi/' : 'service.openplanner.fr/',
            schemes: isDev ? ['http'] : ['https'],
            consumes: ['application/json'],
            produces: ['application/json'],
            securityDefinitions: {
                apiKey: {
                    type: 'apiKey',
                    name: 'apiKey',
                    in: 'query',
                },
            },
        },
    })
    fastify.register(FastifySwaggerUi, {
        routePrefix: '/',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: false,
            tryItOutEnabled: true,
        },
    })
    fastify.addHook('onSend', noCacheHook)
    fastify.setErrorHandler(fastifyErrorHandler)

    return fastify
}

const fastify = setupServiceFastify()
fastify.register(pdfRoute)

export const serviceApi = onRequest({ timeoutSeconds: 300, region: 'europe-west1' }, async (request, reply) => {
    fastify.ready((error) => {
        if (error) throw error
        fastify.server.emit('request', request, reply)
    })
})
