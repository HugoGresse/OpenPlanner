import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { collections } from '../../services/firebase'

export const linkOpenPlannerEventToConferenceHallEvent = async (eventId: string, conferenceHallEventId: string) => {
    return await updateDoc(doc(collections.events, eventId), {
        conferenceHallId: conferenceHallEventId,
        updatedAt: serverTimestamp(),
    })
}
