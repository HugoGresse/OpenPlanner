import { FastifyInstance } from 'fastify'

export const addContentTypeParserForServerless = (fastify: FastifyInstance<any, any, any, any, any>) => {
    // For serverless compatibility
    fastify.addContentTypeParser('application/json', {}, (req, body, done) => {
        done(null, (body as any).body)
    })
    fastify.addContentTypeParser('multipart/form-data', {}, (req, body, done) => {
        done(null, req)
    })
}
