import { Session } from '../../../types'
import { getDocs } from 'firebase/firestore'
import { collections } from '../../../services/firebase'

export const getSessions = async (eventId: string): Promise<Session[]> => {
    const snapshots = await getDocs(collections.sessions(eventId))

    return snapshots.docs.map((snapshot) => ({
        ...snapshot.data(),
    }))
}
