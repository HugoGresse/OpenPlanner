import { Session } from '../../../types'
import { DateTime } from 'luxon'
import { DEFAULT_SESSION_DURATION } from './scheduleConstants'
import { updateSession } from '../../actions/sessions/updateSession'
import { mapSessionToFirestoreSession } from '../../actions/sessions/mapSessionToFirestoreSession'
import { UseQueryResult } from '../../../services/hooks/firestoreQueryHook'

export const onFullCalendarEventChange = (
    eventId: string,
    sessions: UseQueryResult<Session[]>,
    sessionId: string | null,
    trackId: string | undefined,
    startJs: Date | null,
    endJs: Date | null
) => {
    if (!trackId || !sessionId) {
        console.warn('Missing trackId or sessionId')
        return
    }
    if (!startJs) {
        console.warn('Missing startJs')
        return
    }

    const session = (sessions.data || []).find((s: Session) => s.id === sessionId)

    if (!session) {
        console.warn('Missing session')
        return
    }

    const start = DateTime.fromJSDate(startJs)
    const end = endJs
        ? DateTime.fromJSDate(endJs)
        : start
        ? start.plus({ minutes: session.durationMinutes || DEFAULT_SESSION_DURATION })
        : start
    const durationMinutes = end ? end.diff(start, 'minutes').minutes : DEFAULT_SESSION_DURATION

    const updateDocument = {
        ...session,
        trackId: trackId,
        dates: {
            start: start,
            end: end,
        },
        durationMinutes: durationMinutes,
    }

    return updateSession(eventId, mapSessionToFirestoreSession(updateDocument))
}
