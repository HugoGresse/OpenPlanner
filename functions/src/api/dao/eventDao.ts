import firebase from 'firebase-admin'
import { Event } from '../../types'

export class EventDao {
    public static async getEvent(firebaseApp: firebase.app.App, eventId: string): Promise<Event> {
        const db = firebaseApp.firestore()
        const event = await db.collection('events').doc(eventId).get()
        const data = event.data()

        if (!data) {
            throw new Error('Event not found')
        }
        return data as Event
    }
}
