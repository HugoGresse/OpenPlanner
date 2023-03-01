import { UseQueryResult } from 'react-query'
import { DocumentData, query, QueryConstraint } from '@firebase/firestore'
import { where } from 'firebase/firestore'
import { useFirestoreQueryData } from '@react-query-firebase/firestore'
import { conferenceHallCollections } from '../firebase/conferenceHallFirebase'

export const useConferenceHallEvents = (userId: string): UseQueryResult<DocumentData> => {
    const constraints: QueryConstraint[] = []

    constraints.push(where('owner', '==', userId))

    return useFirestoreQueryData('ch-events', query(conferenceHallCollections.events, ...constraints))
}
