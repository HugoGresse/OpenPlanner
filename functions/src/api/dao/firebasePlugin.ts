import fp from 'fastify-plugin'
import fb, { credential } from 'firebase-admin'
import { FastifyInstance } from 'fastify'

function firebase(fastify: FastifyInstance, options: any, next: () => void) {
    const appConfig = {
        credential:
            credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string)) ||
            fb.credential.applicationDefault(),
    }

    const firebaseApp = fb.initializeApp(appConfig)

    if (!fastify.firebase) {
        fastify.decorate('firebase', firebaseApp)
    }

    fastify.firebase = firebaseApp
    next()
}

export const firebasePlugin = fp(firebase, {
    fastify: '>=1.1.0',
    name: 'fastify-firebase',
})
