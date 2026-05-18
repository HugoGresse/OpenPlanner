import firebase from 'firebase-admin'

const { FieldValue } = firebase.firestore

export interface EmailMessage {
    to: string | string[]
    subject: string
    text: string
    html?: string
}

export const sendTriggerEmail = async (
    firebaseApp: firebase.app.App,
    message: EmailMessage,
    extraMetadata?: Record<string, unknown>
): Promise<void> => {
    const db = firebaseApp.firestore()
    const collection = process.env.MAIL_COLLECTION || 'mail'
    await db.collection(collection).add({
        to: message.to,
        message: {
            subject: message.subject,
            text: message.text,
            html: message.html || message.text.replace(/\n/g, '<br>'),
        },
        createdAt: FieldValue.serverTimestamp(),
        ...extraMetadata,
    })
}
