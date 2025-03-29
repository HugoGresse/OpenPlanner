import { useCallback, useState } from 'react'
import { bupherAPI } from '../../events/actions/social/bupherAPI'
import { useBupherAuth } from './useBupherAuth'
import { Event } from '../../types'

export const useBupherDraftPost = (event: Event) => {
    const [state, setState] = useState<{
        isLoading: boolean
        error: string | null
    }>({
        isLoading: false,
        error: null,
    })

    const post = useCallback(
        async (channels: string[], text: string, file: File) => {
            setState((prev) => ({ ...prev, isLoading: true, error: null }))

            const response = await bupherAPI.postDraftPost(event.id, event.apiKey || '', channels, text, file)

            if (!response.success) {
                setState((prev) => ({ ...prev, isLoading: false, error: response.error || 'Unknown error' }))
                return false
            }

            return true
        },
        [event]
    )

    return {
        post,
        ...state,
    }
}
