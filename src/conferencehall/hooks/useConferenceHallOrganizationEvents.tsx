import { DocumentData, query, QueryConstraint } from '@firebase/firestore'
import { where } from 'firebase/firestore'
import { conferenceHallCollections } from '../firebase/conferenceHallFirebase'
import { useFirestoreCollection, UseQueryResult } from '../../services/hooks/firestoreQueryHook'

export const useConferenceHallOrganizationEvents = (orgId: string): UseQueryResult<DocumentData> => {
    const constraints: QueryConstraint[] = []

    constraints.push(where(`organization`, '==', orgId))

    return useFirestoreCollection(query(conferenceHallCollections.events, ...constraints))
}
