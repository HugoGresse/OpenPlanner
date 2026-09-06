import { onRequest } from 'firebase-functions/v2/https'
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { addContentTypeParserForServerless } from '../api/other/addContentTypeParserForServerless'
import { pdfRoute } from './pdf'
import { fastifyErrorHandler } from '../api/other/fastifyErrorHandler'
import cors from '@fastify/cors'
import { noCacheHook } from '../utils/noCacheHook'
import { serviceApiKeyPlugin } from './serviceApiKeyPreHandler'
import { fastifyAuth, FastifyAuthFunction } from '@fastify/auth'
import { registerApiDocs } from '../api/other/registerApiDocs'
import { isDev } from '../utils/functionUrls'

declare module 'fastify' {
    interface FastifyInstance {
        verifyServiceApiKey: FastifyAuthFunction
    }
}

export const setupServiceFastify = () => {
    const isNodeEnvDev = process.env.NODE_ENV === 'development'
    const isNodeEnvTest = process.env.NODE_ENV === 'test'

    const fastify = Fastify({
        logger: isDev(),
    }).withTypeProvider<TypeBoxTypeProvider>()

    if (!isNodeEnvDev && !isNodeEnvTest) {
        addContentTypeParserForServerless(fastify)
    }

    fastify.register(fastifyAuth)
    fastify.register(serviceApiKeyPlugin)
    fastify.register(cors, {
        origin: '*',
    })
    registerApiDocs(fastify, { title: 'OpenPlanner Service API', functionName: 'serviceApi' })
    fastify.addHook('onSend', noCacheHook)
    fastify.setErrorHandler(fastifyErrorHandler)
    fastify.register(pdfRoute)

    return fastify
}

const fastify = setupServiceFastify()

export const serviceApi = onRequest(
    { timeoutSeconds: 300, region: 'europe-west1', memory: '1GiB' },
    async (request, reply) => {
        fastify.ready((error) => {
            if (error) throw error
            fastify.server.emit('request', request, reply)
        })
    }
)
