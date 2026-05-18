import firebase from 'firebase-admin'
import crypto from 'crypto'

const { FieldValue } = firebase.firestore

const MAX_PER_EMAIL_PER_DAY = 5
const MAX_PER_IP_PER_DAY = 20

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
                    type: 'email',
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
                    type: 'ip',
                },
                { merge: true }
            )
            return { allowed: true, count: current + 1 }
        })
    }
}
