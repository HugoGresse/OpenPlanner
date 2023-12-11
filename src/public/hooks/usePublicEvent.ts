import { UseQueryResult } from '../../services/hooks/firestoreQueryHook'
import { useFetch } from './useFetch'
import { PublicFaqReply } from '../publicTypes'

const baseAPIUrl = import.meta.env.VITE_FIREBASE_OPEN_PLANNER_API_URL

export const usePublicEvent = (eventId?: string): UseQueryResult<PublicFaqReply> => {
    const route = `${baseAPIUrl}/v1/${eventId}/faq/`

    const result = useFetch<PublicFaqReply>(route, {
        method: 'GET',
    })

    return result
}
