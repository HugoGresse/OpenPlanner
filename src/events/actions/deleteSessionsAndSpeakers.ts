import { doc, writeBatch } from 'firebase/firestore'
import { Event } from '../../types'
import { collections, instanceFirestore } from '../../services/firebase'
import { getSessions } from './sessions/getSessions'
import { getSpeakers } from './getSpeakers'

export const deleteSessionsAndSpeakers = async (event: Event) => {
    const sessions = await getSessions(event.id)
    const speakers = await getSpeakers(event.id)

    const batch = writeBatch(instanceFirestore)

    for (const s of sessions) {
        batch.delete(doc(collections.sessions(event.id), s.id))
    }
    for (const s of speakers) {
        batch.delete(doc(collections.speakers(event.id), s.id))
    }

    await batch.commit()
}
