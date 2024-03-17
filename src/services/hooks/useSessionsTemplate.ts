import { collections } from '../firebase'
import { Event, Session, Speaker } from '../../types'
import { useFirestoreCollection, UseQueryResult } from './firestoreQueryHook'

const hydrateSession = (event: Event, data: Session[]) => {
    return data.map((session: Session) => ({
        ...session,
        formatText: event.formats ? event.formats.find((f) => session.format === f.id)?.name : null,
        categoryObject: event.categories ? event.categories.find((c) => session.category === c.id) : null,
    }))
}

export const useSessionTemplate = (event: Event): UseQueryResult<Session[]> => {
    const eventId = event.id

    const sessionsQueryResult = useFirestoreCollection(collections.sessionsTemplate(eventId), true)
    return {
        ...sessionsQueryResult,
        data: hydrateSession(event, sessionsQueryResult.data || []),
    }
}
