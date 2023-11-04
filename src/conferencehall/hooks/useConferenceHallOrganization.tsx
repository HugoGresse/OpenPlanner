import { DocumentData, query, QueryConstraint } from '@firebase/firestore'
import { where } from 'firebase/firestore'
import { conferenceHallCollections } from '../firebase/conferenceHallFirebase'
import { useFirestoreCollection, UseQueryResult } from '../../services/hooks/firestoreQueryHook'

const ROLES = ['owner', 'member', 'reviewer']

export const useConferenceHallOrganization = (userId: string): UseQueryResult<DocumentData> => {
    const constraints: QueryConstraint[] = []

    constraints.push(where(`members.${userId}`, 'in', ROLES))

    return useFirestoreCollection(query(conferenceHallCollections.organizations, ...constraints))
}
