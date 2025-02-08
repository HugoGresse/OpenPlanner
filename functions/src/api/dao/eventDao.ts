import firebase from 'firebase-admin'
import { Category, Event, Format, Track } from '../../types'

const { FieldValue } = firebase.firestore
import { randomColor } from '../other/randomColor'

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

    public static async createCategory(
        firebaseApp: firebase.app.App,
        eventId: string,
        category: Category
    ): Promise<any> {
        const db = firebaseApp.firestore()

        return await db
            .collection(`events`)
            .doc(eventId)
            .update({
                categories: FieldValue.arrayUnion({
                    id: category.id,
                    name: category.name,
                    color: category.color || randomColor(),
                }),
            })
            .catch((error) => {
                console.error('error creating category', error)
                throw new Error('Error creating category ' + error)
            })
    }

    public static async createTrack(firebaseApp: firebase.app.App, eventId: string, track: Track): Promise<any> {
        const db = firebaseApp.firestore()

        return await db
            .collection(`events`)
            .doc(eventId)
            .update({
                tracks: FieldValue.arrayUnion({
                    id: track.id,
                    name: track.name,
                }),
            })
            .catch((error) => {
                console.error('error creating track', error)
                throw new Error('Error creating track ' + error)
            })
    }
    public static async createFormat(firebaseApp: firebase.app.App, eventId: string, format: Format): Promise<any> {
        const db = firebaseApp.firestore()

        return await db
            .collection(`events`)
            .doc(eventId)
            .update({
                formats: FieldValue.arrayUnion({
                    id: format.id,
                    name: format.name,
                    durationMinutes: format.durationMinutes,
                }),
            })
            .catch((error) => {
                console.error('error creating format', error)
                throw new Error('Error creating format ' + error)
            })
    }

    public static async saveBupherSession(
        firebaseApp: firebase.app.App,
        eventId: string,
        session: string
    ): Promise<any> {
        const db = firebaseApp.firestore()
        return await db.collection(`events`).doc(eventId).update({ bupherSession: session })
    }
}
