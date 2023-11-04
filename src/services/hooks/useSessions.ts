import { collections } from '../firebase'
import { SpeakersMap, useSpeakersMap } from './useSpeakersMap'
import { Event, Session, Speaker } from '../../types'
import { useFirestoreCollection, UseQueryResult } from './firebaseQueryHook'

const hydrateSession = (event: Event, sp: UseQueryResult<SpeakersMap>, data: Session[]) => {
    return data.map((session: Session) => ({
        ...session,
        speakersData: sp.data
            ? (session.speakers
                  .map((speakerId) => (sp.data ? sp.data[speakerId] : undefined))
                  .filter((s) => !!s) as Speaker[])
            : undefined,
        formatText: event.formats ? event.formats.find((f) => session.format === f.id)?.name : null,
        categoryObject: event.categories ? event.categories.find((c) => session.category === c.id) : null,
    }))
}

export const useSessionsRaw = (eventId: string): UseQueryResult<Session[]> => {
    return useFirestoreCollection(collections.sessions(eventId), true)
}
export const useSessions = (event: Event): UseQueryResult<Session[]> => {
    const eventId = event.id
    const sp = useSpeakersMap(eventId)

    const sessionsQueryResult = useFirestoreCollection(collections.sessions(eventId), true)
    return {
        ...sessionsQueryResult,
        data: hydrateSession(event, sp, sessionsQueryResult.data || []),
    }
}
