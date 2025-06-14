import FastifySwaggerUi from '@fastify/swagger-ui'
import { FastifyInstance } from 'fastify'
import FastifySwagger from '@fastify/swagger'
import { isDev } from './setupFastify'
import { getFirebaseProjectId } from '../utils/getFirebaseProjectId'

export const registerSwagger = (fastify: FastifyInstance) => {
    fastify.register(FastifySwagger, {
        swagger: {
            info: {
                title: 'OpenPlanner API Documentation',
                version: '1.0.0',
            },
            host: isDev() ? `localhost:5001/${getFirebaseProjectId()}/europe-west1/api/` : 'api.openplanner.fr/',
            schemes: isDev() ? ['http'] : ['https'],
            consumes: ['application/json'],
            produces: ['application/json'],
            securityDefinitions: {
                apiKey: {
                    type: 'apiKey',
                    name: 'apiKey',
                    in: 'query',
                },
                password: {
                    type: 'apiKey',
                    name: 'Transcription password',
                    in: 'headers',
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
}
