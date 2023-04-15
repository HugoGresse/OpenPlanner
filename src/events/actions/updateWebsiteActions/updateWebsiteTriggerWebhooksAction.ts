import { Event } from '../../../types'
import { CreateNotificationOption } from '../../../context/SnackBarProvider'
import { generateStaticJson } from './generateStaticJson'
import { triggerWebhooks } from './triggerWebhooks'
import { updateStaticJson } from './updateStaticJson'

export const updateWebsiteTriggerWebhooksAction = async (
    event: Event,
    createNotification: (message: string, options?: CreateNotificationOption) => void
) => {
    try {
        await updateWebsiteTriggerWebhooksActionInternal(event)
        createNotification('APIs and webhooks triggered', { type: 'success' })
    } catch (error) {
        console.error(error)
        createNotification('Failed to update... ' + String(error), { type: 'success' })
    }
}

const updateWebsiteTriggerWebhooksActionInternal = async (event: Event) => {
    const { outputPrivate, outputPublic } = await generateStaticJson(event)

    const fileNames = await updateStaticJson(event, outputPublic, outputPrivate)

    return await triggerWebhooks(event, fileNames)
}
