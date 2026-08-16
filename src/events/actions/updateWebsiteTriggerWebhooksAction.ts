import { Event } from '../../types'
import { CreateNotificationOption } from '../../context/SnackBarProvider'
import { ensureEventApiKey } from '../../services/hooks/useEnsureApiKey'
import { doc } from 'firebase/firestore'
import { collections } from '../../services/firebase'
import { fetchOpenPlannerApi } from '../../services/hooks/useOpenPlannerApi'

type DeployApiReply = {
    success: boolean
    message: string
    warnings?: string[]
}

export const updateWebsiteTriggerWebhooksAction = async (
    event: Event,
    createNotification: (message: string, options?: CreateNotificationOption) => void
): Promise<boolean> => {
    try {
        await ensureEventApiKey(event, doc(collections.events, event.id))
        const reply = await fetchOpenPlannerApi<DeployApiReply>(event, 'deploy', {
            method: 'POST',
        })
        if (reply.warnings && reply.warnings.length > 0) {
            createNotification(`APIs and webhooks triggered, with warnings: ${reply.warnings.join(', ')}`, {
                type: 'warning',
                dismissDelay: 10000,
            })
        } else {
            createNotification('APIs and webhooks triggered', { type: 'success' })
        }
        return true
    } catch (error) {
        console.error(error)
        createNotification('Failed to update... ' + String(error), { type: 'error', dismissDelay: 10000 })
        return false
    }
}
