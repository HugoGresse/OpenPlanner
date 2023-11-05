import { collections } from '../firebase'
import { DocumentData, query, QueryConstraint } from '@firebase/firestore'
import { where } from 'firebase/firestore'
import { UserId } from '../../auth/authReducer'
import { useFirestoreCollection, UseQueryResult } from './firestoreQueryHook'

export const useEvents = (userId: UserId): UseQueryResult<DocumentData> => {
    const constraints: QueryConstraint[] = []

    constraints.push(where('members', 'array-contains', userId))

    return useFirestoreCollection(query(collections.events, ...constraints), true)
}
