import { collection, getDocs, where , query} from 'firebase/firestore/lite';
import {getConferenceHallFirestore} from './initConferenceHall'
import {FirebaseOptions} from '@firebase/app'

export type ConferenceHallEvent = {
    id: string,
    name: string,
    description: string,

}

export async function getConferenceHallEvents(config: FirebaseOptions): Promise<ConferenceHallEvent[]> {
    // TODO : also get events for the organization
    const firestore = getConferenceHallFirestore(config)
    const eventsCollection = query(collection(firestore, 'events'), where("owner", "==", "yqup4xqvDZWFBIZpPUxIodnMN1a2"))
    const snapshot = await getDocs(eventsCollection)
    return snapshot.docs.map(doc => {
        const d = doc.data()
        return {
            id: doc.id,
            name: d.name,
            description: d.description,
        }
    })
}
