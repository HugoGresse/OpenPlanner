import { Event } from '../../../../../../src/types'
import { generateStaticJson } from './generateStaticJson'
import { triggerWebhooks } from './triggerWebhooks'
import { updateStaticJson } from './updateStaticJson'
import firebase from 'firebase-admin'

export const updateWebsiteTriggerWebhooksActionInternal = async (
    event: Event,
    firebaseApp: firebase.app.App,
    enableWebhooks: boolean
) => {
    const { outputPrivate, outputPublic, outputOpenFeedback, outputVoxxrin } = await generateStaticJson(
        firebaseApp,
        event
    )

    const fileNames = await updateStaticJson(
        firebaseApp,
        event,
        outputPublic,
        outputPrivate,
        outputOpenFeedback,
        outputVoxxrin
    )

    if (enableWebhooks) {
        await triggerWebhooks(firebaseApp, event, fileNames)
    }
    await firebaseApp.firestore().collection('events').doc(event.id).update({ updatedAt: new Date() })
}
