import { collections } from '../firebase'
import { doc, DocumentData } from '@firebase/firestore'
import { useFirestoreDocument, UseQueryResult } from './firebaseQueryHook'

export const useEvent = (eventId?: string): UseQueryResult<DocumentData> => {
    const ref = doc(collections.events, eventId)
    return useFirestoreDocument(ref, true)
}
