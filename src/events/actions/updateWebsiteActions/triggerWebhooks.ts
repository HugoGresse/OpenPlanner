import { Event, EventFiles } from '../../../types'
import { doc, updateDoc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'

export const triggerWebhooks = async (event: Event, files: EventFiles) => {
    const updatedWebhooks = [...event.webhooks]

    const fileUrl = files.public + '?t=' + Date.now()

    for (const [index, webhook] of event.webhooks.entries()) {
        let response = null
        if (webhook.url.startsWith('https://api.github.com')) {
            response = await fetch(webhook.url, {
                method: 'POST',
                body: JSON.stringify({
                    event_type: 'conferencecenter',
                    client_payload: {
                        url: fileUrl,
                    },
                }),
                headers: {
                    accept: 'application/vnd.github.v3+json',
                    authorization: `Bearer ${webhook.token}`,
                },
            })
        } else {
            response = await fetch(webhook.url, {
                method: 'POST',
                body: JSON.stringify({
                    url: fileUrl,
                }),
                headers: {
                    authorization: `Bearer ${webhook.token}`,
                },
            })
        }

        if (response) {
            const responseText = await response.text()
            const responseCode = response.status

            updatedWebhooks[index] = {
                ...webhook,
                lastAnswer: `code: ${responseCode}, body: ${responseText ? responseText : 'empty'}`,
            }
        }
    }

    await updateDoc(doc(collections.events, event.id), {
        webhooks: updatedWebhooks,
    })
}
