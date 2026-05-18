import fastifyPlugin from 'fastify-plugin'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { FastifyAuthFunction } from '@fastify/auth'
import firebase from 'firebase-admin'
import { hashToken, SpeakerEditTokenDao } from './dao/speakerEditTokenDao'

declare module 'fastify' {
    interface FastifyRequest {
        speakerEditTokenContext?: {
            tokenId: string
            speakerId: string
            eventId: string
            usedAt: firebase.firestore.Timestamp | null
        }
    }
}

const verifyRequest = async (fastify: FastifyInstance, request: FastifyRequest, reply: FastifyReply) => {
    // @ts-ignore
    const eventId = request.params?.eventId
    // @ts-ignore
    const speakerId = request.params?.speakerId
    // @ts-ignore
    const token = request.query?.t || request.headers['x-speaker-edit-token']

    if (!eventId || !speakerId) {
        reply.code(400).send({ error: 'Bad Request', success: false })
        return
    }
    if (!token || typeof token !== 'string' || token.length < 20) {
        reply.code(401).send({ error: 'Invalid token', success: false })
        return
    }

    const tokenHash = hashToken(token)
    const tokenDoc = await SpeakerEditTokenDao.findValidTokenByHash(fastify.firebase, eventId, tokenHash)

    if (!tokenDoc) {
        reply.code(401).send({ error: 'Invalid token', success: false })
        return
    }
    if (tokenDoc.speakerId !== speakerId) {
        reply.code(403).send({ error: 'Token does not match speaker', success: false })
        return
    }
    if (tokenDoc.expiresAt && tokenDoc.expiresAt.toDate() < new Date()) {
        reply.code(401).send({ error: 'Token expired', success: false })
        return
    }

    request.speakerEditTokenContext = {
        tokenId: tokenDoc.id,
        speakerId: tokenDoc.speakerId,
        eventId,
        usedAt: tokenDoc.usedAt,
    }
}

export const speakerEditTokenPlugin = fastifyPlugin(
    (fastify: FastifyInstance, options: any, next: () => void) => {
        fastify.decorate<FastifyAuthFunction>(
            'verifySpeakerEditToken',
            async (request: FastifyRequest, reply: FastifyReply) => {
                await verifyRequest(fastify, request, reply)
            }
        )
        next()
    },
    {
        fastify: '>=3.x',
        name: 'verifySpeakerEditToken',
    }
)
