import { collections } from '../firebase'
import { useFirestoreCollection } from './firestoreQueryHook'

export interface EventStats {
    speakersCount: number
    sessionsCount: number
    isLoading: boolean
    error: Error | null | string
}

export const useEventStats = (eventId: string): EventStats => {
    const speakersResult = useFirestoreCollection(collections.speakers(eventId), false)
    const sessionsResult = useFirestoreCollection(collections.sessions(eventId), false)

    return {
        speakersCount: speakersResult.data ? speakersResult.data.length : 0,
        sessionsCount: sessionsResult.data ? sessionsResult.data.length : 0,
        isLoading: speakersResult.isLoading || sessionsResult.isLoading,
        error: speakersResult.error || sessionsResult.error,
    }
}
