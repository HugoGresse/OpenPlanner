import { UseQueryResult } from '../../services/hooks/firestoreQueryHook'
import { useFetch } from './useFetch'
import { PublicFaqReply } from '../publicTypes'

const baseAPIUrl = import.meta.env.VITE_FIREBASE_OPEN_PLANNER_API_URL
export const usePublicEventFaq = (eventId?: string, privateId?: string): UseQueryResult<PublicFaqReply> => {
    const url = new URL(baseAPIUrl as string)
    url.pathname += `v1/${eventId}/faq/`

    if (privateId) {
        url.pathname += `${privateId}`
    }

    return useFetch<PublicFaqReply>(url.href, {
        method: 'GET',
    })
}
