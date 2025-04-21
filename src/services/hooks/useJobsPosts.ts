import { collections } from '../firebase'
import { query } from '@firebase/firestore'
import { useFirestoreCollection, UseQueryResult } from './firestoreQueryHook'
import { JobPost } from '../../types'

export const useJobsPosts = (eventId: string): UseQueryResult<JobPost[] | undefined> => {
    const r = useFirestoreCollection(query(collections.jobPosts(eventId)), true)

    return r
}
