import firebase from 'firebase-admin'
import { Session } from '../../types'
import { Session as SessionConverted } from '../../../../src/types'
import { unknownToDateTime } from '../other/dateConverter'
const { FieldValue } = firebase.firestore

export class SessionDao {
    public static async getSessions(firebaseApp: firebase.app.App, eventId: string): Promise<SessionConverted[]> {
        const db = firebaseApp.firestore()
        const snapshot = await db.collection(`events/${eventId}/sessions`).get()
        return (
            snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Session[]
        ).map((session) => ({
            ...session,
            dates: session.dates
                ? {
                      start: unknownToDateTime(session.dates.start),
                      end: unknownToDateTime(session.dates.end),
                  }
                : null,
        }))
    }

    public static async doesSessionExist(
        firebaseApp: firebase.app.App,
        eventId: string,
        sessionId: string
    ): Promise<boolean | Session> {
        const db = firebaseApp.firestore()

        // 1. Check if the session exist
        const snapshot = await db.collection(`events/${eventId}/sessions`).doc(sessionId).get()
        const existingSessionData = snapshot.data()
        if (!existingSessionData) {
            return false
        }
        return existingSessionData as Session
    }

    public static async createSession(
        firebaseApp: firebase.app.App,
        eventId: string,
        session: Partial<Session> & {
            id: string
        }
    ): Promise<any> {
        const db = firebaseApp.firestore()

        await db
            .collection(`events/${eventId}/sessions`)
            .doc(session.id)
            .set({
                ...session,
                updatedAt: FieldValue.serverTimestamp(),
            })
    }

    public static async updateSession(
        firebaseApp: firebase.app.App,
        eventId: string,
        partialSession: Partial<Session> & { id: string }
    ): Promise<any> {
        const db = firebaseApp.firestore()

        // 1. Check if the session exist
        const existingSessionData = await SessionDao.doesSessionExist(firebaseApp, eventId, partialSession.id)
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

    public static async updateOrCreateSession(
        firebaseApp: firebase.app.App,
        eventId: string,
        session: Partial<Session> & { id: string }
    ): Promise<any> {
        const existingSessionData = await SessionDao.doesSessionExist(firebaseApp, eventId, session.id)
        if (!existingSessionData) {
            await SessionDao.createSession(firebaseApp, eventId, session)
        } else {
            await SessionDao.updateSession(firebaseApp, eventId, session)
        }
    }
}
