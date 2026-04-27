import './other/typeBoxAdditionalsFormats'
import { onRequest } from 'firebase-functions/v2/https'
import { setupFastify } from './setupFastify'

export const fastify = setupFastify()

export const fastifyFunction = onRequest(
    { timeoutSeconds: 300, region: 'europe-west1', memory: '512MiB' },
    async (request, reply) => {
        // Await both Fastify readiness and the outgoing response actually
        // finishing — otherwise Cloud Functions can close the underlying
        // connection while a streaming handler (e.g. SSE) is mid-flight.
        await new Promise<void>((resolve, reject) => {
            fastify.ready((error) => {
                if (error) return reject(error)
                reply.on('close', () => resolve())
                reply.on('finish', () => resolve())
                fastify.server.emit('request', request, reply)
            })
        })
    }
)
