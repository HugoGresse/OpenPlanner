import { UseQueryResult } from 'react-query'
import { collections } from '../firebase'
import { doc, DocumentData } from '@firebase/firestore'
import { useFirestoreDocumentData } from '@react-query-firebase/firestore'

export const useEvent = (eventId?: string): UseQueryResult<DocumentData> => {
    const ref = doc(collections.events, eventId)

    return useFirestoreDocumentData(['events', eventId], ref)
}
