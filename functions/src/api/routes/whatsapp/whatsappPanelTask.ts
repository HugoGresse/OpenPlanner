import { onTaskDispatched } from 'firebase-functions/v2/tasks'
import fb, { credential } from 'firebase-admin'
import { EventDao } from '../../dao/eventDao'
import { credsFromEvent, sendMessage } from './greenApi'
import { WhatsappSessionDao } from './whatsappSessionDao'

export type PanelTaskPayload = { eventId: string; message: string }

// Resource name used to enqueue tasks onto this queue; the region must match where it's deployed.
export const sendWhatsappPanelTaskName = 'locations/europe-west1/functions/sendWhatsappPanel'

// Task-dispatched functions run outside the Fastify app (which owns its own firebase-admin App via
// its plugin), so get-or-create the default App here instead.
const firebaseApp = (): fb.app.App => {
    if (fb.apps.length > 0) return fb.apps[0] as fb.app.App
    const cert = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string)
        : undefined
    return fb.initializeApp({
        credential: cert ? credential.cert(cert) : fb.credential.applicationDefault(),
    })
}

// Sends one scheduled timing reminder. Re-reads the session at execution time so a stale or
// cleared session (e.g. a new track-management run started since) silently skips the send.
export const sendWhatsappPanel = onTaskDispatched<PanelTaskPayload>(
    { region: 'europe-west1', retryConfig: { maxAttempts: 3 }, rateLimits: { maxConcurrentDispatches: 5 } },
    async (request) => {
        const { eventId, message } = request.data
        const app = firebaseApp()

        const event = await EventDao.getEvent(app, eventId)
        const creds = credsFromEvent(event)
        if (!creds) return

        const session = await WhatsappSessionDao.getSession(app, eventId)
        if (!session?.chatId) return

        // Idempotency: retries (maxAttempts: 3) must not re-send a reminder that already went out
        // (e.g. send succeeded but the addPanelSent write failed on the previous attempt).
        if (session.panelsSent?.includes(message)) return

        await sendMessage(creds, session.chatId, message)
        await WhatsappSessionDao.addPanelSent(app, eventId, message)
    }
)
