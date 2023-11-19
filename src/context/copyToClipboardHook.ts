import { useCallback } from 'react'
import { useNotification } from '../hooks/notificationHook'

export const useCopyToClipboard = () => {
    const { createNotification } = useNotification()

    return useCallback(
        async (data: string) => {
            await navigator.clipboard.writeText(data)
            createNotification('Copied!', { type: 'success' })
        },
        [createNotification]
    )
}
