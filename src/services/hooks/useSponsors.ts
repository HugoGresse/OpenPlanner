import { UseQueryResult } from 'react-query'
import { useFirestoreQueryData } from '@react-query-firebase/firestore'
import { collections } from '../firebase'
import { DocumentData, query } from '@firebase/firestore'
import { sponsorKeys } from './queriesKeys'

export const useSponsors = (eventId: string): UseQueryResult<DocumentData> => {
    return useFirestoreQueryData(sponsorKeys.all(eventId), query(collections.sponsors(eventId)))
}
