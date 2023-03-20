import { Event, NewEvent, Session, Speaker } from '../types'
import { FirestoreDataConverter } from '@firebase/firestore'
import { DateTime } from 'luxon'

export const eventConverter: FirestoreDataConverter<Event | NewEvent> = {
    fromFirestore(snapshot): Event {
        const data = snapshot.data()

        return {
            id: snapshot.id,
            ...data,
            dates: {
                start: data.dates?.start ? data.dates.start.toDate() : null,
                end: data.dates?.end ? data.dates.end.toDate() : null,
            },
        } as Event
    },
    toFirestore(event: NewEvent) {
        return event
    },
}

export const sessionConverter: FirestoreDataConverter<Session> = {
    fromFirestore(snapshot): Session {
        const data = snapshot.data()

        return {
            id: snapshot.id,
            ...data,
            category: data.category || null,
            dates: {
                start: data.dates?.start
                    ? DateTime.fromJSDate(data.dates.start.toDate()).set({ second: 0, millisecond: 0 })
                    : null,
                end: data.dates?.end
                    ? DateTime.fromJSDate(data.dates.end.toDate()).set({ second: 0, millisecond: 0 })
                    : null,
            },
        } as Session
    },
    toFirestore(session: Session) {
        return Object.keys(session).reduce((acc, key) => {
            // @ts-ignore
            acc[key] = session[key] === undefined ? null : session[key]

            return acc
        }, {})
    },
}

export const speakerConverter: FirestoreDataConverter<Speaker> = {
    fromFirestore(snapshot): Speaker {
        const data = snapshot.data()

        return {
            id: snapshot.id,
            ...data,
        } as Speaker
    },
    toFirestore(speaker: Speaker) {
        return speaker
    },
}
