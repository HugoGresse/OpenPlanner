import firebase from 'firebase-admin'
import { TrackSession } from './trackSession'

const SESSION_DOC = 'current'

const sessionRef = (firebaseApp: firebase.app.App, eventId: string) =>
    firebaseApp.firestore().collection('events').doc(eventId).collection('whatsapp').doc(SESSION_DOC)

export const WhatsappSessionDao = {
    async getSession(firebaseApp: firebase.app.App, eventId: string): Promise<TrackSession | null> {
        const snap = await sessionRef(firebaseApp, eventId).get()
        return snap.exists ? (snap.data() as TrackSession) : null
    },

    async saveSession(firebaseApp: firebase.app.App, eventId: string, session: TrackSession): Promise<void> {
        await sessionRef(firebaseApp, eventId).set(session)
    },
}
