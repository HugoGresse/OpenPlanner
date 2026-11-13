import firebase from 'firebase-admin'

const { FieldValue } = firebase.firestore

export type AiActionRecord = {
    tool: string
    target: { id: string; label?: string }
    args: Record<string, unknown>
    diff: { before: Record<string, unknown>; after: Record<string, unknown> | null }
    summary?: string
    prompt?: string
    model?: string
    applied: boolean
    rejected?: boolean
}

export class AiActionDao {
    public static async addAction(
        firebaseApp: firebase.app.App,
        eventId: string,
        record: AiActionRecord
    ): Promise<string> {
        const db = firebaseApp.firestore()
        const ref = await db.collection(`events/${eventId}/aiActions`).add({
            ...record,
            createdAt: FieldValue.serverTimestamp(),
        })
        return ref.id
    }
}
