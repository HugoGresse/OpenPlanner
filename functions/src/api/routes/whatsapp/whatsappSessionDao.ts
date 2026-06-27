import firebase from 'firebase-admin'
import { Event } from '../../../types'
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

    // GreenAPI's incoming webhook is global per instance and carries no eventId, so map the instance
    // id back to its event.
    async findEventByInstanceId(
        firebaseApp: firebase.app.App,
        instanceId: string
    ): Promise<{ id: string; event: Event } | null> {
        const query = await firebaseApp
            .firestore()
            .collection('events')
            .where('greenApiInstanceId', '==', instanceId)
            .limit(1)
            .get()
        if (query.empty) return null
        const doc = query.docs[0]
        return { id: doc.id, event: { ...(doc.data() as Event), id: doc.id } }
    },
}
