import { doc, updateDoc } from 'firebase/firestore'
import { Speaker } from '../../../types'
import { collections } from '../../../services/firebase'

export const updateSpeaker = async (eventId: string, speaker: Partial<Speaker>): Promise<void> => {
    const ref = doc(collections.speakers(eventId), speaker.id)

    return await updateDoc(ref, {
        ...speaker,
    })
}
