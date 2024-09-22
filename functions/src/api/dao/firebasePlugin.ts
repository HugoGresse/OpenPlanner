import fp from 'fastify-plugin'
import fb, { credential } from 'firebase-admin'
import { FastifyInstance } from 'fastify'
import { defineString } from 'firebase-functions/params'

export function setupFirebase(fastify: FastifyInstance, options: any, next: () => void) {
    const cert = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string)
        : undefined

    const appConfig = {
        credential: cert ? credential.cert(cert) : fb.credential.applicationDefault(),
    }

    const firebaseApp = fb.initializeApp(appConfig)

    if (!fastify.firebase) {
        fastify.decorate('firebase', firebaseApp)
    }

    fastify.firebase = firebaseApp
    next()
}

export const firebasePlugin = fp(setupFirebase, {
    fastify: '>=1.1.0',
    name: 'fastify-firebase',
})

export const getStorageBucketName = () => {
    const storageBucketParam = defineString('BUCKET', {
        input: { resource: { type: 'storage.googleapis.com/Bucket' } },
        description:
            'This will automatically populate the selector field with the deploying Cloud Project’s  storage buckets',
    })
    return storageBucketParam.value()
}
