import { doc, updateDoc, writeBatch } from 'firebase/firestore'
import { Session, Speaker } from '../../../types'
import { collections, instanceFirestore } from '../../../services/firebase'

export const updateSpeaker = async (eventId: string, speaker: Partial<Speaker>): Promise<void> => {
    const ref = doc(collections.speakers(eventId), speaker.id)

    return await updateDoc(ref, {
        ...speaker,
    })
}

export const updateSessions = async (eventId: string, sessions: Partial<Session>[]): Promise<void> => {
    const batch = writeBatch(instanceFirestore)

    sessions.forEach((session) => {
        const ref = doc(collections.sessions(eventId), session.id)
        batch.update(ref, {
            ...session,
        })
    })

    return await batch.commit()
}
