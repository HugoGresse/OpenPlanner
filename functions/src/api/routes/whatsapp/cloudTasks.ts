import fb from 'firebase-admin'
import { PanelTaskPayload } from './whatsappPanelTask'

// The reminder tasks live in the Cloud Tasks queue Firebase creates for the onTaskDispatched function
// (queue id === function name), in the same region it is deployed to. We talk to the Cloud Tasks REST
// API directly (authenticated with the admin SDK's access token) to avoid pulling the heavy
// @google-cloud/tasks client just for list/delete.
const LOCATION = 'europe-west1'
const QUEUE_ID = 'sendWhatsappPanel'
const API_BASE = 'https://cloudtasks.googleapis.com/v2'

export type ScheduledPanel = { name: string; scheduleTime: string | null; message: string }

const projectId = (app: fb.app.App): string => {
    const id =
        app.options.projectId ||
        process.env.GCLOUD_PROJECT ||
        process.env.GCP_PROJECT ||
        process.env.GOOGLE_CLOUD_PROJECT
    if (!id) throw new Error('Project id not found in environment')
    return id
}

// The admin SDK credential yields an OAuth token scoped for cloud-platform, which Cloud Tasks accepts.
const accessToken = async (app: fb.app.App): Promise<string> => {
    const credential = app.options.credential ?? fb.credential.applicationDefault()
    const { access_token } = await credential.getAccessToken()
    return access_token
}

const queuePath = (app: fb.app.App): string => `projects/${projectId(app)}/locations/${LOCATION}/queues/${QUEUE_ID}`

// `path` is a resource path (e.g. "projects/.../tasks/123"), optionally with a query string.
const apiFetch = async (app: fb.app.App, path: string, init: RequestInit = {}): Promise<any> => {
    const res = await fetch(`${API_BASE}/${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${await accessToken(app)}`,
            'Content-Type': 'application/json',
            ...(init.headers || {}),
        },
    })
    const text = await res.text()
    if (!res.ok) {
        throw new Error(`Cloud Tasks ${init.method || 'GET'} failed (${res.status}): ${text}`)
    }
    return text ? JSON.parse(text) : {}
}

// Firebase enqueues the payload as the JSON body `{ data: <payload> }` (base64 in the REST response);
// tolerate a bare payload too.
const decodePayload = (bodyBase64: unknown): PanelTaskPayload | null => {
    if (typeof bodyBase64 !== 'string' || bodyBase64.length === 0) return null
    try {
        const parsed = JSON.parse(Buffer.from(bodyBase64, 'base64').toString('utf8'))
        return (parsed?.data ?? parsed) as PanelTaskPayload
    } catch {
        return null
    }
}

// Lists the still-pending reminder tasks for one event, soonest first.
export const listScheduledPanels = async (app: fb.app.App, eventId: string): Promise<ScheduledPanel[]> => {
    const out: ScheduledPanel[] = []
    let pageToken: string | undefined
    // Few tasks per queue, but page through to be correct.
    do {
        const query = `responseView=FULL&pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`
        const data = await apiFetch(app, `${queuePath(app)}/tasks?${query}`)
        for (const task of data.tasks || []) {
            const payload = decodePayload(task?.httpRequest?.body)
            if (!payload || payload.eventId !== eventId) continue
            out.push({ name: String(task.name), scheduleTime: task.scheduleTime || null, message: payload.message })
        }
        pageToken = data.nextPageToken || undefined
    } while (pageToken)

    return out.sort((a, b) => (a.scheduleTime || '').localeCompare(b.scheduleTime || ''))
}

// Deletes a single reminder task, but only if it belongs to this event's queue (guards against
// deleting another queue's / another event's task via a forged name).
export const deleteScheduledPanel = async (app: fb.app.App, eventId: string, name: string): Promise<boolean> => {
    if (!name.startsWith(`${queuePath(app)}/tasks/`)) return false
    try {
        const task = await apiFetch(app, `${name}?responseView=FULL`)
        const payload = decodePayload(task?.httpRequest?.body)
        if (!payload || payload.eventId !== eventId) return false
    } catch {
        return false
    }
    await apiFetch(app, name, { method: 'DELETE' })
    return true
}
