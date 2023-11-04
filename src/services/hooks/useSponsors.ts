import { collections } from '../firebase'
import { DocumentData, query } from '@firebase/firestore'
import { useFirestoreCollection, UseQueryResult } from './firebaseQueryHook'

export const useSponsors = (eventId: string): UseQueryResult<DocumentData> => {
    return useFirestoreCollection(query(collections.sponsors(eventId)), true)
}
