import { collections } from '../firebase'
import { doc, DocumentData } from '@firebase/firestore'
import { useFirestoreDocument, UseQueryResult } from './firestoreQueryHook'
import { DocumentReference } from 'firebase/firestore'
import { Event } from '../../types'

export const useEvent = (eventId?: string): UseQueryResult<DocumentData> => {
    const ref: DocumentReference<Event> = doc(collections.events, eventId) as DocumentReference<Event>
    return useFirestoreDocument<Event>(ref, true)
}
