import { FastifyInstance } from 'fastify'
import FastifySwagger, { FastifyDynamicSwaggerOptions } from '@fastify/swagger'
import ScalarApiReference from '@scalar/fastify-api-reference'
import { getFirebaseProjectId } from '../../utils/getFirebaseProjectId'

type SecuritySchemes = NonNullable<
    NonNullable<NonNullable<FastifyDynamicSwaggerOptions['openapi']>['components']>['securitySchemes']
>
type SecurityScheme = SecuritySchemes[string]

export type ApiDocsOptions = {
    title: string
    functionName: 'api' | 'serviceApi'
    productionUrl: string
    securitySchemes: SecuritySchemes
}

export const API_KEY_SECURITY_SCHEME: SecurityScheme = { type: 'apiKey', name: 'apiKey', in: 'query' }

const serverUrl = ({ functionName, productionUrl }: ApiDocsOptions): string => {
    if (process.env.NODE_ENV === 'development') return `http://localhost:${process.env.PORT || 3010}`
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        return `http://localhost:5001/${getFirebaseProjectId()}/europe-west1/${functionName}`
    }
    return productionUrl
}

// OpenAPI document from the route schemas (@fastify/swagger) rendered by Scalar at `/`.
// The raw document stays reachable at `/openapi.json` for tooling.
export const registerApiDocs = (fastify: FastifyInstance<any, any, any, any, any>, options: ApiDocsOptions) => {
    fastify.register(FastifySwagger, {
        openapi: {
            info: { title: options.title, version: '1.0.0' },
            servers: [{ url: serverUrl(options) }],
            components: { securitySchemes: options.securitySchemes },
        },
    })
    fastify.register(ScalarApiReference, {
        routePrefix: '/',
        configuration: { hideDownloadButton: false },
    })
}
