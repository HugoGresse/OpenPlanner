import { SponsorCategory } from '../../types'
import { getDocs } from 'firebase/firestore'
import { collections } from '../../services/firebase'

export const getSponsors = async (eventId: string): Promise<SponsorCategory[]> => {
    const snapshots = await getDocs(collections.sponsors(eventId))

    return snapshots.docs.map((snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
    }))
}
