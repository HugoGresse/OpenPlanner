import { Event } from '../../types'
import { CreateNotificationOption } from '../../context/SnackBarProvider'
import { ensureEventApiKey } from '../../services/hooks/useEnsureApiKey'
import { doc } from 'firebase/firestore'
import { collections } from '../../services/firebase'
import { fetchOpenPlannerApi } from '../../services/hooks/useOpenPlannerApi'
export const updateWebsiteTriggerWebhooksAction = async (
    event: Event,
    createNotification: (message: string, options?: CreateNotificationOption) => void
) => {
    try {
        await ensureEventApiKey(event, doc(collections.events, event.id))
        await fetchOpenPlannerApi(event, 'deploy', {
            method: 'POST',
        })
        createNotification('APIs and webhooks triggered', { type: 'success' })
    } catch (error) {
        console.error(error)
        createNotification('Failed to update... ' + String(error), { type: 'error' })
    }
}
