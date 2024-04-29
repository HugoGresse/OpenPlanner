import { doc, updateDoc, writeBatch } from 'firebase/firestore'
import { Session } from '../../../types'
import { collections, instanceFirestore } from '../../../services/firebase'

export const updateSession = async (eventId: string, session: Session): Promise<void> => {
    const ref = doc(collections.sessions(eventId), session.id)

    return await updateDoc(ref, {
        ...session,
        dates: {
            start: session.dates?.start ? session.dates.start.toJSDate() : null,
            end: session.dates?.end ? session.dates.end.toJSDate() : null,
        },
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
