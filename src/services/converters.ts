import { Event } from '../types'
import { FirestoreDataConverter } from '@firebase/firestore'

export const eventConverter: FirestoreDataConverter<Event> = {
    fromFirestore(snapshot): Event {
        const data = snapshot.data()

        return {
            id: snapshot.id,
            ...data,
        } as Event
    },
    toFirestore(): Event {
        throw new Error('Client does not support updating event.')
    },
}
