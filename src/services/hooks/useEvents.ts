import { UseQueryResult } from 'react-query'
import { useFirestoreQueryData } from '@react-query-firebase/firestore'
import { collections } from '../firebase'
import { DocumentData, query, QueryConstraint } from '@firebase/firestore'
import { where } from 'firebase/firestore'
import { UserId } from '../../auth/authReducer'

export const useEvents = (userId: UserId): UseQueryResult<DocumentData> => {
    const constraints: QueryConstraint[] = []

    constraints.push(where('members', 'array-contains', userId))

    return useFirestoreQueryData('events', query(collections.events, ...constraints))
}
