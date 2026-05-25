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
    // SMTP credentials come from plain env vars, matching the existing
    // pattern used by CAP_SECRET, SERVICE_API_KEY, etc. (see functions/.env
    // and the captchaVerify helper). Set the values locally via
    // functions/.env and on Cloud Functions via deploy-time env vars or
    // --set-env-vars.
    //
    // We take each SMTP component as its own variable rather than a single
    // composed URI so neither the user nor the password ever needs URL
    // encoding (`@` in the Mailgun username was a recurring foot-gun on
    // the previous single-URI shape).
    const host = process.env.MAILGUN_SMTP_HOST
    const user = process.env.MAILGUN_SMTP_USER
    const password = process.env.MAILGUN_SMTP_PASSWORD
    if (!host || !user || !password) {
        throw new Error(
            'Mailgun SMTP env vars are not configured (need MAILGUN_SMTP_HOST, MAILGUN_SMTP_USER, MAILGUN_SMTP_PASSWORD)'
        )
    }
    // Port defaults to 465 (implicit TLS) — the most common Mailgun setup.
    // 587 + STARTTLS is also supported by passing MAILGUN_SMTP_PORT=587.
    const port = Number(process.env.MAILGUN_SMTP_PORT || 465)
    // `secure: true` = implicit TLS from byte zero (port 465). For 587 we
    // want STARTTLS, which nodemailer negotiates when `secure: false`.
    const secure = port === 465
    cachedTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass: password },
        pool: true,
        maxConnections: 3,
        maxMessages: 50,
    })
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
 * Failures surface in three places:
 *   1. The `mail/{docId}` audit row is patched with
 *      delivery.state = 'ERROR' + delivery.error.
 *   2. A `console.error` is emitted from inside this helper with the
 *      contextual metadata (recipient, message id, error message) so the
 *      Cloud Function logs always show the failure even if a caller
 *      forgets to log around the throw.
 *   3. The error is re-thrown — callers MUST guard the call with try/catch
 *      if they want to react to it (most do).
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
                    error: 'MAIL_FROM env var not configured',
                    leaseExpireTime: null,
                    endTime: FieldValue.serverTimestamp(),
                },
            },
            { merge: true }
        )
        throw new Error('MAIL_FROM env var is not configured')
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
        // Log with the audit doc id + recipient so Cloud Function logs are
        // self-sufficient — operators do not need to grep Firestore to
        // diagnose a failed send.
        console.error('sendEmail SMTP failure', {
            mailDocId: docRef.id,
            to: message.to,
            error: errorMessage,
            ...(extraMetadata || {}),
        })
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

// Test-only escape hatch for dropping the cached transporter between
// vitest cases. It IS exported (vitest imports this module directly), but
// the underscore-prefixed name marks it as private API and the runtime
// guard below makes it a no-op outside `NODE_ENV=test` so an accidental
// production call cannot break the warm-instance pool.
export const __resetEmailTransporterForTests = (): void => {
    if (process.env.NODE_ENV !== 'test') return
    cachedTransporter = null
}
