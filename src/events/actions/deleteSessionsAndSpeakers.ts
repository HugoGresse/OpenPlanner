import { doc, getDocs, writeBatch } from 'firebase/firestore'
import { Event, Session, Speaker } from '../../types'
import { collections, instanceFirestore } from '../../services/firebase'

const getSession = async (eventId: string): Promise<Session[]> => {
    const snapshots = await getDocs(collections.sessions(eventId))

    return snapshots.docs.map((snapshot) => ({
        ...snapshot.data(),
    }))
}
const getSpeakers = async (eventId: string): Promise<Speaker[]> => {
    const snapshots = await getDocs(collections.speakers(eventId))

    return snapshots.docs.map((snapshot) => ({
        ...snapshot.data(),
    }))
}

export const deleteSessionsAndSpeakers = async (event: Event, onlyConferenceHallOne = true) => {
    const sessions = await getSession(event.id)
    const speakers = await getSpeakers(event.id)

    const batch = writeBatch(instanceFirestore)

    for (const s of sessions) {
        if (onlyConferenceHallOne && !s.conferenceHallId) {
            continue
        }
        batch.delete(doc(collections.sessions(event.id), s.id))
    }
    for (const s of speakers) {
        if (onlyConferenceHallOne && !s.conferenceHallId) {
            continue
        }
        batch.delete(doc(collections.speakers(event.id), s.id))
    }

    await batch.commit()
}
