import { UseQueryResult } from 'react-query'
import { useFirestoreQueryData } from '@react-query-firebase/firestore'
import { collections } from '../firebase'
import { DocumentData } from '@firebase/firestore'

export const useSessions = (eventId: string): UseQueryResult<DocumentData> => {
    return useFirestoreQueryData(['session', eventId], collections.sessions(eventId))
}
