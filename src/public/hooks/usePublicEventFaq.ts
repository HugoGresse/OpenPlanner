import { UseQueryResult } from '../../services/hooks/firestoreQueryHook'
import { useFetch } from './useFetch'
import { PublicFaqReply } from '../publicTypes'
import { BaseAPIUrl } from './constants'

export const usePublicEventFaq = (eventId?: string, privateId?: string): UseQueryResult<PublicFaqReply> => {
    const url = new URL(BaseAPIUrl as string)
    url.pathname += `v1/${eventId}/faq/`

    if (privateId) {
        url.pathname += `${privateId}`
    }

    return useFetch<PublicFaqReply>(url.href, {
        method: 'GET',
    })
}
