import fp from 'fastify-plugin'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { FastifyAuthFunction } from '@fastify/auth'

declare module 'fastify' {
    interface FastifyInstance {
        verifySuperAdmin: FastifyAuthFunction
    }
}

// Authenticates a logged-in OpenPlanner user via their Firebase ID token and
// requires them to be listed in admins/users/admins (the super-admin list the
// Firestore rules already use).
const superAdmin = (fastify: FastifyInstance, options: any, next: () => void) => {
    fastify.decorate('verifySuperAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
        const authorization = request.headers.authorization
        if (!authorization || !authorization.startsWith('Bearer ')) {
            reply.code(401).send({ error: 'Missing bearer token' })
            return
        }
        try {
            const decoded = await fastify.firebase.auth().verifyIdToken(authorization.slice('Bearer '.length))
            const adminDoc = await fastify.firebase.firestore().doc(`admins/users/admins/${decoded.uid}`).get()
            if (!adminDoc.exists) {
                reply.code(403).send({ error: 'Not a super admin' })
            }
        } catch (error) {
            reply.code(401).send({ error: 'Invalid token' })
        }
    })
    next()
}

export const superAdminPlugin = fp(superAdmin, {
    fastify: '>=1.1.0',
    name: 'fastify-super-admin',
})
