import { collections } from '../firebase'
import { query } from '@firebase/firestore'
import { useFirestoreCollection, UseQueryResult } from './firestoreQueryHook'
import { SponsorCategory } from '../../types'

export const useSponsors = (eventId: string): UseQueryResult<SponsorCategory[] | undefined> => {
    const r = useFirestoreCollection(query(collections.sponsors(eventId)), true)

    const data: SponsorCategory[] | undefined = r.data?.sort((a, b) => {
        if (!isNaN(a.order) && !isNaN(b.order)) {
            return a.order - b.order
        }
        return 0
    }) as SponsorCategory[] | undefined

    return {
        ...r,
        data,
    }
}
