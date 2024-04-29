import { doc, updateDoc } from 'firebase/firestore'
import { Event } from '../../types'
import { collections } from '../../services/firebase'

export const updateEvent = async (eventId: string, event: Partial<Event>): Promise<void> => {
    const ref = doc(collections.events, eventId)

    return await updateDoc(ref, {
        ...event,
    })
}
