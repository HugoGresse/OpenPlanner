import firebase from 'firebase-admin'
import { escapeHtml } from './htmlEscape'

const { FieldValue } = firebase.firestore

export interface EmailMessage {
    to: string | string[]
    subject: string
    text: string
    html?: string
}

// Convert a plain-text email body into safe HTML. Escapes every character
// that has meaning in HTML, then turns newlines into <br>. Callers that
// want richer HTML must pass `message.html` explicitly — that branch
// trusts the caller to have already sanitised any interpolated values.
const textToSafeHtml = (text: string): string => escapeHtml(text).replace(/\n/g, '<br>')

export const sendTriggerEmail = async (
    firebaseApp: firebase.app.App,
    message: EmailMessage,
    extraMetadata?: Record<string, unknown>
): Promise<void> => {
    const db = firebaseApp.firestore()
    const collection = process.env.MAIL_COLLECTION || 'mail'
    // Strip CR/LF from the subject to prevent SMTP header injection if a
    // caller ever interpolates untrusted input into the subject line.
    const safeSubject = message.subject.replace(/[\r\n]+/g, ' ').slice(0, 998)
    await db.collection(collection).add({
        to: message.to,
        message: {
            subject: safeSubject,
            text: message.text,
            html: message.html || textToSafeHtml(message.text),
        },
        createdAt: FieldValue.serverTimestamp(),
        ...extraMetadata,
    })
}
