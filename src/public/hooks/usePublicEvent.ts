import { UseQueryResult } from '../../services/hooks/firestoreQueryHook'
import { useFetch } from './useFetch'
import { BaseAPIUrl } from './constants'

export type PublicEventData = {
    name: string
    description: string
    startDate: string
    endDate: string
}

export const usePublicEvent = (eventId?: string): UseQueryResult<PublicEventData> => {
    const url = new URL(BaseAPIUrl as string)
    url.pathname += `v1/${eventId}/public`

    return useFetch<PublicEventData>(url.href, {
        method: 'GET',
    })
}
