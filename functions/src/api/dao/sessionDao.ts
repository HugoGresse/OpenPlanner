import firebase from 'firebase-admin'
import { Session } from '../../types'

const { FieldValue } = firebase.firestore

export class SessionDao {
    public static async updateSession(
        firebaseApp: firebase.app.App,
        eventId: string,
        partialSession: Partial<Session> & { id: string }
    ): Promise<any> {
        const db = firebaseApp.firestore()

        // 1. Check if the session exist
        const snapshot = await db.collection(`events/${eventId}/sessions`).doc(partialSession.id).get()
        const existingSessionData = snapshot.data()
        if (!existingSessionData) {
            throw new Error('Session not found')
        }

        // 2. Update the session
        await db
            .collection(`events/${eventId}/sessions/`)
            .doc(partialSession.id)
            .update({
                ...partialSession,
                updatedAt: FieldValue.serverTimestamp(),
            })

        // 3. Return the updated session
        const snapshot2 = await db.collection(`events/${eventId}/sessions`).doc(partialSession.id).get()
        return snapshot2.data() as Session
    }
}
