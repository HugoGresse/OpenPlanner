import { collections } from '../firebase'
import { where, query } from 'firebase/firestore'
import { Event, Session, Speaker } from '../../types'
import { SpeakersMap, useSpeakersMap } from './useSpeakersMap'
import { useFirestoreCollection, UseQueryResult } from './firestoreQueryHook'
import { getSessionFormatText } from './useSessions'

const hydrateSession = (event: Event, sp: UseQueryResult<SpeakersMap>, data: Session[]) => {
    return data.map((session: Session) => ({
        ...session,
        speakersData:
            sp.data && session.speakers
                ? (session.speakers
                      .map((speakerId) => (sp.data ? sp.data[speakerId] : undefined))
                      .filter((s) => !!s) as Speaker[])
                : undefined,
        formatText: getSessionFormatText(event, session),
        categoryObject: event.categories ? event.categories.find((c) => session.category === c.id) : null,
    }))
}

export const useSpeakerSessions = (event: Event, speakerId: string): UseQueryResult<Session[]> => {
    const eventId = event.id
    const sp = useSpeakersMap(eventId)

    // Create a query with a where filter for sessions that include this speaker
    const sessionsQuery = query(collections.sessions(eventId), where('speakers', 'array-contains', speakerId))

    const sessionsQueryResult = useFirestoreCollection(sessionsQuery, true)

    return {
        ...sessionsQueryResult,
        data: hydrateSession(event, sp, sessionsQueryResult.data || []),
    }
}
