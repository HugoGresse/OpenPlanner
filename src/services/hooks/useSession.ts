import { UseQueryResult } from 'react-query'
import { useFirestoreDocumentData } from '@react-query-firebase/firestore'
import { collections } from '../firebase'
import { useSpeakersMap } from './useSpeakersMap'
import { doc } from 'firebase/firestore'
import { Session } from '../../types'

export const useSession = (eventId: string, sessionId: string): UseQueryResult<Session> => {
    const sp = useSpeakersMap(eventId)

    const s = useFirestoreDocumentData(['session', eventId, sessionId], doc(collections.sessions(eventId), sessionId))

    if (sp.data && s.data) {
        s.data = {
            ...s.data,
            speakersData: s.data?.speakers.map((speakerId) => sp.data[speakerId]),
        } as Session
        return s as UseQueryResult<Session>
    }

    return s as UseQueryResult<Session>
}
