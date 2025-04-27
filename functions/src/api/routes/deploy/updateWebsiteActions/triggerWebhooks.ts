import { Event, EventFiles } from '../../../../../../src/types'
import firebase from 'firebase-admin'
import { getUploadFilePath } from './getFilesNames'

export const triggerWebhooks = async (firebaseApp: firebase.app.App, event: Event, files: EventFiles) => {
    const updatedWebhooks = [...event.webhooks]

    const fullyQualifiedUrls = getUploadFilePath(files).public + '?t=' + Date.now()

    for (const [index, webhook] of event.webhooks.entries()) {
        let response = null
        if (webhook.url.startsWith('https://api.github.com')) {
            response = await fetch(webhook.url, {
                method: 'POST',
                body: JSON.stringify({
                    event_type: 'openplanner',
                    client_payload: {
                        url: fullyQualifiedUrls,
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
                    url: fullyQualifiedUrls,
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
                lastAnswerDate: new Date() as any, // Firestore expect a JS date but return a Timestamp object
            }
        }
    }

    const db = firebaseApp.firestore()
    await db.collection('events').doc(event.id).update({
        webhooks: updatedWebhooks,
    })
}
