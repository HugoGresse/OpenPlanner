import firebase from 'firebase-admin'
import crypto from 'crypto'

const { FieldValue, Timestamp } = firebase.firestore

// Rate-limit docs live for the active counter day plus a small grace window
// then get garbage-collected by Firestore TTL (configured via the
// `expiresAt` field on the `speakerEditRateLimits` collection group in
// firestore.indexes.json). Two-day window keeps records around long enough
// to survive timezone math + late-night requests without accumulating
// forever.
const TTL_MS = 2 * 24 * 60 * 60 * 1000
const ttlFromNow = (): firebase.firestore.Timestamp => Timestamp.fromDate(new Date(Date.now() + TTL_MS))

const MAX_PER_EMAIL_PER_DAY = 5
const MAX_PER_IP_PER_DAY = 20
// Caps how many photo uploads a speaker may stage per day across the whole
// 7-day token window. Photo upload bypasses the magic-link single-use rule
// (the token is only consumed on `/submit`), so without a separate counter
// a leaked token could be replayed to fill the storage bucket. 10/day per
// speaker is generous for legitimate users iterating on a profile picture
// while still capping abuse at the ~70 file ceiling per token lifetime.
const MAX_PHOTO_UPLOADS_PER_SPEAKER_PER_DAY = 10

const todayKey = (): string => {
    const d = new Date()
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}${m}${day}`
}

const hashKey = (input: string): string => {
    return crypto.createHash('sha256').update(input.toLowerCase().trim()).digest('hex')
}

export class SpeakerEditRateLimitDao {
    public static async incrementAndCheckEmail(
        firebaseApp: firebase.app.App,
        eventId: string,
        email: string
    ): Promise<{ allowed: boolean; count: number }> {
        const db = firebaseApp.firestore()
        const docId = `email_${hashKey(email)}_${todayKey()}`
        const ref = db.collection(`events/${eventId}/speakerEditRateLimits`).doc(docId)

        return db.runTransaction(async (tx) => {
            const snap = await tx.get(ref)
            const current = snap.exists ? (snap.data()?.count as number) || 0 : 0
            if (current >= MAX_PER_EMAIL_PER_DAY) {
                return { allowed: false, count: current }
            }
            tx.set(
                ref,
                {
                    count: current + 1,
                    lastSentAt: FieldValue.serverTimestamp(),
                    expiresAt: ttlFromNow(),
                    type: 'email',
                },
                { merge: true }
            )
            return { allowed: true, count: current + 1 }
        })
    }

    public static async incrementAndCheckPhotoUpload(
        firebaseApp: firebase.app.App,
        eventId: string,
        speakerId: string
    ): Promise<{ allowed: boolean; count: number }> {
        const db = firebaseApp.firestore()
        const docId = `photo_${hashKey(speakerId)}_${todayKey()}`
        const ref = db.collection(`events/${eventId}/speakerEditRateLimits`).doc(docId)

        return db.runTransaction(async (tx) => {
            const snap = await tx.get(ref)
            const current = snap.exists ? (snap.data()?.count as number) || 0 : 0
            if (current >= MAX_PHOTO_UPLOADS_PER_SPEAKER_PER_DAY) {
                return { allowed: false, count: current }
            }
            tx.set(
                ref,
                {
                    count: current + 1,
                    lastSentAt: FieldValue.serverTimestamp(),
                    expiresAt: ttlFromNow(),
                    type: 'photo',
                },
                { merge: true }
            )
            return { allowed: true, count: current + 1 }
        })
    }

    public static async incrementAndCheckIp(
        firebaseApp: firebase.app.App,
        eventId: string,
        ip: string
    ): Promise<{ allowed: boolean; count: number }> {
        const db = firebaseApp.firestore()
        const docId = `ip_${hashKey(ip)}_${todayKey()}`
        const ref = db.collection(`events/${eventId}/speakerEditRateLimits`).doc(docId)

        return db.runTransaction(async (tx) => {
            const snap = await tx.get(ref)
            const current = snap.exists ? (snap.data()?.count as number) || 0 : 0
            if (current >= MAX_PER_IP_PER_DAY) {
                return { allowed: false, count: current }
            }
            tx.set(
                ref,
                {
                    count: current + 1,
                    lastSentAt: FieldValue.serverTimestamp(),
                    expiresAt: ttlFromNow(),
                    type: 'ip',
                },
                { merge: true }
            )
            return { allowed: true, count: current + 1 }
        })
    }
}
