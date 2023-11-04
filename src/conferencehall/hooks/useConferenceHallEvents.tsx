import { DocumentData, query, QueryConstraint } from '@firebase/firestore'
import { where } from 'firebase/firestore'
import { conferenceHallCollections } from '../firebase/conferenceHallFirebase'
import { useFirestoreCollection, UseQueryResult } from '../../services/hooks/firebaseQueryHook'

export const useConferenceHallEvents = (userId: string): UseQueryResult<DocumentData> => {
    const constraints: QueryConstraint[] = []

    constraints.push(where('owner', '==', userId))

    return useFirestoreCollection(query(conferenceHallCollections.events, ...constraints))
}
