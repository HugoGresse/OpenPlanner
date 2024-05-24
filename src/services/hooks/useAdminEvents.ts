import { collections } from '../firebase'
import { orderBy, query, QueryConstraint } from '@firebase/firestore'
import { useFirestoreCollection, UseQueryResult } from './firestoreQueryHook'
import { Event } from '../../types'
import { event2Converter } from '../converters'

export const useAdminEvents = (): UseQueryResult<Event[]> => {
    const constraints: QueryConstraint[] = []
    constraints.push(orderBy('createdAt', 'desc'))

    return useFirestoreCollection(query(collections.events, ...constraints).withConverter(event2Converter), false)
}
