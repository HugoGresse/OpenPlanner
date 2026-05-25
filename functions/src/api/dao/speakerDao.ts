import { Speaker } from '../../types'
import firebase from 'firebase-admin'

const { FieldValue } = firebase.firestore

export class SpeakerDao {
    public static async getSpeakers(firebaseApp: firebase.app.App, eventId: string): Promise<Speaker[]> {
        const db = firebaseApp.firestore()
        const snapshot = await db.collection(`events/${eventId}/speakers`).get()
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Speaker[]
    }

    /**
     * Look up a speaker by email on an event without loading the full collection.
     *
     * The `email` field is not normalised on write — existing speakers may have
     * stored mixed-case addresses, so we issue up to two indexed equality
     * queries (raw input + lowercased) and return the first hit. Net cost is
     * 1–2 small queries instead of an O(n) scan of all speakers, which matters
     * for events with hundreds of speakers and the daily rate-limit budget of
     * 5 requests per email.
     *
     * Firestore creates the single-field index on `email` automatically.
     */
    public static async getSpeakerByEmail(
        firebaseApp: firebase.app.App,
        eventId: string,
        email: string
    ): Promise<Speaker | null> {
        const db = firebaseApp.firestore()
        const trimmed = email.trim()
        const lower = trimmed.toLowerCase()
        const candidates = trimmed === lower ? [lower] : [trimmed, lower]

        for (const candidate of candidates) {
            const snapshot = await db
                .collection(`events/${eventId}/speakers`)
                .where('email', '==', candidate)
                .limit(1)
                .get()
            if (!snapshot.empty) {
                const doc = snapshot.docs[0]
                return { id: doc.id, ...doc.data() } as Speaker
            }
        }
        return null
    }

    public static async doesSpeakerExist(
        firebaseApp: firebase.app.App,
        eventId: string,
        speakerId: string
    ): Promise<boolean | Speaker> {
        const db = firebaseApp.firestore()

        // 1. Check if the session exist
        const snapshot = await db.collection(`events/${eventId}/speakers`).doc(speakerId).get()
        const existingSessionData = snapshot.data()
        if (!existingSessionData) {
            return false
        }
        return existingSessionData as Speaker
    }

    public static async createSpeaker(
        firebaseApp: firebase.app.App,
        eventId: string,
        speaker: Partial<Speaker> & {
            id: string
        }
    ): Promise<any> {
        const db = firebaseApp.firestore()

        await db
            .collection(`events/${eventId}/speakers`)
            .doc(speaker.id)
            .set({
                ...speaker,
                updatedAt: FieldValue.serverTimestamp(),
            })
        return speaker
    }

    public static async updateSpeaker(
        firebaseApp: firebase.app.App,
        eventId: string,
        speaker: Partial<Speaker> & {
            id: string
        }
    ): Promise<any> {
        const db = firebaseApp.firestore()

        // 1. Check if the session exist
        const existingSpeakerData = await SpeakerDao.doesSpeakerExist(firebaseApp, eventId, speaker.id)
        if (!existingSpeakerData) {
            throw new Error('Speaker not found')
        }

        await db
            .collection(`events/${eventId}/speakers`)
            .doc(speaker.id)
            .set({
                ...speaker,
                updatedAt: FieldValue.serverTimestamp(),
            })
    }

    public static async patchSpeaker(
        firebaseApp: firebase.app.App,
        eventId: string,
        speaker: Partial<Speaker> & { id: string }
    ): Promise<void> {
        const db = firebaseApp.firestore()

        const existingSpeakerData = await SpeakerDao.doesSpeakerExist(firebaseApp, eventId, speaker.id)
        if (!existingSpeakerData) {
            throw new Error('Speaker not found')
        }

        const { id, ...rest } = speaker
        const patchData: { [key: string]: unknown } = {
            ...rest,
            updatedAt: FieldValue.serverTimestamp(),
        }

        if (rest.customFields !== undefined) {
            const existingCustomFields = (existingSpeakerData as Speaker).customFields || {}
            patchData.customFields = {
                ...existingCustomFields,
                ...rest.customFields,
            }
        }

        await db.collection(`events/${eventId}/speakers`).doc(id).set(patchData, { merge: true })
    }

    public static async deleteSpeaker(
        firebaseApp: firebase.app.App,
        eventId: string,
        speakerId: string
    ): Promise<void> {
        const db = firebaseApp.firestore()

        const existingSpeakerData = await SpeakerDao.doesSpeakerExist(firebaseApp, eventId, speakerId)
        if (!existingSpeakerData) {
            throw new Error('Speaker not found')
        }

        await db.collection(`events/${eventId}/speakers`).doc(speakerId).delete()
    }

    public static async updateOrCreateSpeaker(
        firebaseApp: firebase.app.App,
        eventId: string,
        speaker: Partial<Speaker> & { id: string }
    ): Promise<any> {
        const existingSpeakerData = await SpeakerDao.doesSpeakerExist(firebaseApp, eventId, speaker.id)
        if (!existingSpeakerData) {
            await SpeakerDao.createSpeaker(firebaseApp, eventId, speaker)
        } else {
            await SpeakerDao.updateSpeaker(firebaseApp, eventId, speaker)
        }
    }
}
