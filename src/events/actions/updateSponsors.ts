import { SponsorCategory } from '../../types'
import { doc, writeBatch } from 'firebase/firestore'
import { collections, instanceFirestore } from '../../services/firebase'

export const updateSponsors = async (eventId: string, sponsors: SponsorCategory[]): Promise<void> => {
    // a firestore batch to update all sponsors
    const batch = writeBatch(instanceFirestore)

    for (const cat of sponsors) {
        const catRef = doc(collections.sponsors(eventId), cat.id)
        batch.set(catRef, cat)
    }

    return await batch.commit()
}
