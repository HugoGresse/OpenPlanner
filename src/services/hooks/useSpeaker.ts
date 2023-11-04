import { collections } from '../firebase'
import { doc } from 'firebase/firestore'
import { Speaker } from '../../types'
import { useFirestoreDocument, UseQueryResult } from './firestoreQueryHook'

export const useSpeaker = (eventId: string, speakerId: string): UseQueryResult<Speaker> => {
    return useFirestoreDocument(doc(collections.speakers(eventId), speakerId), true)
}
