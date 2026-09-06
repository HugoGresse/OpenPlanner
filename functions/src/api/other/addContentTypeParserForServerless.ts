import { FastifyInstance } from 'fastify'
import { IncomingMessage } from 'node:http'

type PreParsedRequest = IncomingMessage & { body?: unknown }

const readStream = (stream: IncomingMessage): Promise<string> =>
    new Promise((resolve, reject) => {
        let raw = ''
        stream.setEncoding('utf8')
        stream.on('data', (chunk: string) => (raw += chunk))
        stream.on('end', () => resolve(raw))
        stream.on('error', reject)
    })

// Cloud Functions hands Fastify an Express request whose JSON body was already
// consumed and parsed (req.body). Requests that did not go through Express, such
// as fastify.inject() replays, still carry a live stream and are parsed here.
export const addContentTypeParserForServerless = (fastify: FastifyInstance<any, any, any, any, any>) => {
    fastify.addContentTypeParser('application/json', {}, (_req, payload, done) => {
        const request = payload as PreParsedRequest
        if (request.body !== undefined) return done(null, request.body)
        if (request.readableEnded) return done(null, undefined)
        readStream(request)
            .then((raw) => done(null, raw ? JSON.parse(raw) : undefined))
            .catch((error) => done(error as Error))
    })
    fastify.addContentTypeParser('multipart/form-data', {}, (req, body, done) => {
        done(null, req)
    })
}
