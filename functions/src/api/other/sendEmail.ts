import nodemailer, { Transporter } from 'nodemailer'
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

// Cache the nodemailer transporter across invocations in the same
// Cloud Function instance — a single SMTP authentication handshake amortises
// across every email sent during a warm container's lifetime instead of
// re-negotiating per request.
let cachedTransporter: Transporter | null = null

const getTransporter = (): Transporter => {
    if (cachedTransporter) return cachedTransporter
    const uri = process.env.MAILGUN_SMTP_URI
    if (!uri) {
        throw new Error('MAILGUN_SMTP_URI secret is not configured')
    }
    // nodemailer accepts the SMTP URI directly as createTransport's first
    // arg at runtime (see nodemailer docs), but its TS types do not
    // expose that overload — hence the cast. The URI's scheme
    // (`smtps://` vs `smtp://`) controls TLS mode; pool: true keeps the
    // connection alive across messages within the same warm container.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cachedTransporter = (nodemailer.createTransport as any)(uri, {
        pool: true,
        maxConnections: 3,
        maxMessages: 50,
    }) as Transporter
    return cachedTransporter
}

const sanitiseSubject = (raw: string): string => {
    // Strip CR/LF to block SMTP header injection if a caller ever
    // interpolates untrusted input into the subject line. Cap at the
    // RFC 5322 line-length ceiling so downstream relays do not silently
    // fold or truncate the header in unpredictable ways.
    return raw.replace(/[\r\n]+/g, ' ').slice(0, 998)
}

/**
 * Send an email via the configured SMTP transport (Mailgun in production).
 *
 * Replaces the previous Firebase "Trigger Email" extension dependency. The
 * function still records each outbound message in the `mail/` Firestore
 * collection as a durable audit log + retry buffer, but the actual SMTP
 * send happens synchronously inside this Cloud Function — no extension is
 * required, and the per-email cost collapses to ordinary Mailgun pricing.
 *
 * The function is designed to be fire-and-forget from the caller's point
 * of view: it returns void and surfaces failures through the `mail`
 * audit row (delivery.state = 'ERROR' + delivery.error) and a console
 * log. Callers MUST guard the call with try/catch if they want to react
 * to a failure.
 */
export const sendEmail = async (
    firebaseApp: firebase.app.App,
    message: EmailMessage,
    extraMetadata?: Record<string, unknown>
): Promise<void> => {
    const subject = sanitiseSubject(message.subject)
    const html = message.html || textToSafeHtml(message.text)
    const from = process.env.MAIL_FROM || ''

    // Write the audit row FIRST so we have a record of intent even if
    // the SMTP send blows up. The row mirrors the schema the old Trigger
    // Email extension wrote, so any tooling that reads `mail/` keeps
    // working unchanged.
    const db = firebaseApp.firestore()
    const collection = process.env.MAIL_COLLECTION || 'mail'
    const docRef = await db.collection(collection).add({
        to: message.to,
        from,
        message: { subject, text: message.text, html },
        createdAt: FieldValue.serverTimestamp(),
        delivery: { state: 'PENDING' },
        ...extraMetadata,
    })

    if (!from) {
        await docRef.set(
            {
                delivery: {
                    state: 'ERROR',
                    error: 'MAIL_FROM secret not configured',
                    leaseExpireTime: null,
                    endTime: FieldValue.serverTimestamp(),
                },
            },
            { merge: true }
        )
        throw new Error('MAIL_FROM secret is not configured')
    }

    try {
        const transporter = getTransporter()
        const info = await transporter.sendMail({
            from,
            to: message.to,
            subject,
            text: message.text,
            html,
        })
        await docRef.set(
            {
                delivery: {
                    state: 'SUCCESS',
                    info: { messageId: info.messageId, response: info.response || null },
                    endTime: FieldValue.serverTimestamp(),
                },
            },
            { merge: true }
        )
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        await docRef.set(
            {
                delivery: {
                    state: 'ERROR',
                    error: errorMessage,
                    endTime: FieldValue.serverTimestamp(),
                },
            },
            { merge: true }
        )
        throw err
    }
}

// Test-only helper to drop the cached transporter between vitest cases.
// Not exported to runtime callers — vitest imports this file directly and
// can reach it through the module namespace.
export const __resetEmailTransporterForTests = (): void => {
    cachedTransporter = null
}
