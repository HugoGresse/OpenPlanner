import { collections } from '../firebase'
import { DocumentData, query } from '@firebase/firestore'
import { useFirestoreCollection, UseQueryResult } from './firestoreQueryHook'

export const useSponsors = (eventId: string): UseQueryResult<DocumentData> => {
    return useFirestoreCollection(query(collections.sponsors(eventId)), true)
}
