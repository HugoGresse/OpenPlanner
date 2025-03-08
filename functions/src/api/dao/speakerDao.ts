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
