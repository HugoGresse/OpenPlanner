import { collections } from '../firebase'
import { useSpeakersMap } from './useSpeakersMap'
import { doc } from 'firebase/firestore'
import { Session } from '../../types'
import { useFirestoreDocument, UseQueryResult } from './firestoreQueryHook'

export const useSession = (eventId: string, sessionId: string): UseQueryResult<Session> => {
    const sp = useSpeakersMap(eventId)

    const s = useFirestoreDocument(doc(collections.sessions(eventId), sessionId))

    if (sp.data && s.data) {
        s.data = {
            ...s.data,
            speakersData: s.data?.speakers.map((speakerId) => (sp.data ? sp.data[speakerId] : undefined)),
        } as Session
        return s as UseQueryResult<Session>
    }

    return s as UseQueryResult<Session>
}
