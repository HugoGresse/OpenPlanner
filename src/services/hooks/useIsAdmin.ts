import { UserId } from '../../auth/authReducer'
import { useFirestoreDocument } from './firestoreQueryHook'
import { doc } from 'firebase/firestore'
import { collections } from '../firebase'

export const useIsAdmin = (userId: UserId): boolean => {
    const ref = doc(collections.adminsUsers, userId)

    const results = useFirestoreDocument(ref)

    // noinspection RedundantIfStatementJS
    if (!results.error && results.data && results.loaded && results.data.id === userId) {
        return true
    }

    return false
}
