import { Event, NewEvent } from '../types'
import { FirestoreDataConverter } from '@firebase/firestore'

export const eventConverter: FirestoreDataConverter<Event | NewEvent> = {
    fromFirestore(snapshot): Event {
        const data = snapshot.data()

        return {
            id: snapshot.id,
            ...data,
        } as Event
    },
    toFirestore(event: NewEvent) {
        return event
    },
}
