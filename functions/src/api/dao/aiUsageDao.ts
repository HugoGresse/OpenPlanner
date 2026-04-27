import firebase from 'firebase-admin'

const { FieldValue } = firebase.firestore

const monthKey = (date = new Date()) => {
    const y = date.getUTCFullYear()
    const m = `${date.getUTCMonth() + 1}`.padStart(2, '0')
    return `${y}-${m}`
}

export class AiUsageDao {
    public static async getMonthTokens(
        firebaseApp: firebase.app.App,
        eventId: string,
        date = new Date()
    ): Promise<number> {
        const db = firebaseApp.firestore()
        const snap = await db.collection(`events/${eventId}/aiUsage`).doc(monthKey(date)).get()
        if (!snap.exists) return 0
        const data = snap.data() as { totalTokens?: number } | undefined
        return data?.totalTokens ?? 0
    }

    public static async incrementUsage(
        firebaseApp: firebase.app.App,
        eventId: string,
        tokens: { prompt: number; completion: number; total: number },
        date = new Date()
    ): Promise<void> {
        const db = firebaseApp.firestore()
        await db
            .collection(`events/${eventId}/aiUsage`)
            .doc(monthKey(date))
            .set(
                {
                    promptTokens: FieldValue.increment(tokens.prompt),
                    completionTokens: FieldValue.increment(tokens.completion),
                    totalTokens: FieldValue.increment(tokens.total),
                    requests: FieldValue.increment(1),
                    updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true }
            )
    }
}
