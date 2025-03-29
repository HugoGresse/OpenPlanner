import { useCallback, useState } from 'react'
import { bupherAPI, BupherProfile } from '../../events/actions/social/bupherAPI'
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
        async (profiles: BupherProfile[], text: string, file: File) => {
            setState((prev) => ({ ...prev, isLoading: true, error: null }))

            const response = await bupherAPI.postDraftPost(event.id, event.apiKey || '', profiles, text, file)

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
