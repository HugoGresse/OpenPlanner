import { Session } from '../../../types'
import { getDocs } from 'firebase/firestore'
import { collections } from '../../../services/firebase'

export const getTemplate = async (eventId: string): Promise<Session[]> => {
    const snapshots = await getDocs(collections.sessionsTemplate(eventId))

    return snapshots.docs.map((snapshot) => ({
        ...snapshot.data(),
    }))
}
