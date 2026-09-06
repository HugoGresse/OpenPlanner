import { FastifyInstance } from 'fastify'
import FastifySwagger, { FastifyDynamicSwaggerOptions } from '@fastify/swagger'
import { OpenPlannerFunction, functionBaseUrl } from '../../utils/functionUrls'

type SecuritySchemes = NonNullable<
    NonNullable<NonNullable<FastifyDynamicSwaggerOptions['openapi']>['components']>['securitySchemes']
>

export type ApiDocsOptions = {
    title: string
    functionName: OpenPlannerFunction
    securitySchemes?: SecuritySchemes
}

// Scalar's browser client loaded from its CDN: the function only serves a tiny HTML shell
// and the OpenAPI document, so cold starts and egress stay unaffected by the docs.
const SCALAR_CDN_URL = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1'

const referenceHtml = (title: string) => `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
</head>
<body>
    <div id="app"></div>
    <script src="${SCALAR_CDN_URL}"></script>
    <script>Scalar.createApiReference('#app', { url: 'openapi.json' })</script>
</body>
</html>
`

export const registerApiDocs = (fastify: FastifyInstance<any, any, any, any, any>, options: ApiDocsOptions) => {
    fastify.register(FastifySwagger, {
        openapi: {
            info: { title: options.title, version: '1.0.0' },
            servers: [{ url: functionBaseUrl(options.functionName) }],
            components: {
                securitySchemes: {
                    apiKey: { type: 'apiKey', name: 'apiKey', in: 'query' },
                    ...options.securitySchemes,
                },
            },
        },
    })
    const html = referenceHtml(options.title)
    fastify.get('/', { schema: { hide: true } }, (_request, reply) => reply.type('text/html; charset=utf-8').send(html))
    fastify.get('/openapi.json', { schema: { hide: true } }, () => fastify.swagger())
}
