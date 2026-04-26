import fb from 'firebase-admin'

export const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
export const EMULATOR_PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-openplanner-test'

let cachedApp: fb.app.App | null = null

export const setupEmulatorEnv = (): void => {
    process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOST
    process.env.GCLOUD_PROJECT = EMULATOR_PROJECT_ID
    process.env.GOOGLE_CLOUD_PROJECT = EMULATOR_PROJECT_ID
}

export const getEmulatorApp = (): fb.app.App => {
    setupEmulatorEnv()
    if (cachedApp) return cachedApp
    const existing = fb.apps.find((a) => a?.name === 'emulator-test') as fb.app.App | undefined
    cachedApp = existing ?? fb.initializeApp({ projectId: EMULATOR_PROJECT_ID }, 'emulator-test')
    return cachedApp
}

export const clearFirestoreEmulator = async (): Promise<void> => {
    setupEmulatorEnv()
    const url = `http://${EMULATOR_HOST}/emulator/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents`
    const res = await fetch(url, { method: 'DELETE' })
    if (!res.ok) {
        throw new Error(`Failed to clear firestore emulator (${res.status}): ${await res.text()}`)
    }
}

export const seedDoc = async (path: string, data: Record<string, unknown>): Promise<void> => {
    await getEmulatorApp().firestore().doc(path).set(data)
}

export const getDoc = async (path: string): Promise<FirebaseFirestore.DocumentData | null> => {
    const snap = await getEmulatorApp().firestore().doc(path).get()
    return snap.exists ? snap.data() ?? null : null
}

export const seedEvent = (eventId: string, data: Record<string, unknown> = {}) =>
    seedDoc(`events/${eventId}`, { id: eventId, ...data })

export const seedSpeaker = (eventId: string, speakerId: string, data: Record<string, unknown> = {}) =>
    seedDoc(`events/${eventId}/speakers/${speakerId}`, { id: speakerId, ...data })

export const getSpeaker = (eventId: string, speakerId: string) => getDoc(`events/${eventId}/speakers/${speakerId}`)
