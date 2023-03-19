import { Speaker } from '../../types'
import { getDocs } from 'firebase/firestore'
import { collections } from '../../services/firebase'

export const getSpeakers = async (eventId: string): Promise<Speaker[]> => {
    const snapshots = await getDocs(collections.speakers(eventId))

    return snapshots.docs.map((snapshot) => ({
        ...snapshot.data(),
    }))
}
