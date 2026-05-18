import firebase from 'firebase-admin'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

const { FieldValue, Timestamp } = firebase.firestore

const TOKEN_TTL_DAYS = 7

export interface SpeakerEditToken {
    id: string
    speakerId: string
    tokenHash: string
    createdAt: firebase.firestore.Timestamp
    expiresAt: firebase.firestore.Timestamp
    usedAt: firebase.firestore.Timestamp | null
    requestIp?: string | null
}

export const hashToken = (rawToken: string): string => {
    return crypto.createHash('sha256').update(rawToken).digest('hex')
}

export const generateRawToken = (): string => {
    return crypto.randomBytes(32).toString('base64url')
}

export class SpeakerEditTokenDao {
    public static async createToken(
        firebaseApp: firebase.app.App,
        eventId: string,
        speakerId: string,
        requestIp?: string | null
    ): Promise<{ tokenId: string; rawToken: string; expiresAt: Date }> {
        const db = firebaseApp.firestore()
        const tokenId = uuidv4()
        const rawToken = generateRawToken()
        const tokenHash = hashToken(rawToken)
        const now = new Date()
        const expiresAt = new Date(now.getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)

        await db
            .collection(`events/${eventId}/speakerEditTokens`)
            .doc(tokenId)
            .set({
                id: tokenId,
                speakerId,
                tokenHash,
                createdAt: FieldValue.serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiresAt),
                usedAt: null,
                requestIp: requestIp || null,
            })

        return { tokenId, rawToken, expiresAt }
    }

    public static async findValidTokenByHash(
        firebaseApp: firebase.app.App,
        eventId: string,
        tokenHash: string
    ): Promise<SpeakerEditToken | null> {
        const db = firebaseApp.firestore()
        const snapshot = await db
            .collection(`events/${eventId}/speakerEditTokens`)
            .where('tokenHash', '==', tokenHash)
            .limit(1)
            .get()

        if (snapshot.empty) return null

        const doc = snapshot.docs[0]
        return { id: doc.id, ...doc.data() } as SpeakerEditToken
    }

    public static async markTokenUsed(firebaseApp: firebase.app.App, eventId: string, tokenId: string): Promise<void> {
        const db = firebaseApp.firestore()
        await db
            .collection(`events/${eventId}/speakerEditTokens`)
            .doc(tokenId)
            .set({ usedAt: FieldValue.serverTimestamp() }, { merge: true })
    }
}
