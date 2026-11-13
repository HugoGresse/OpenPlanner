import firebase from 'firebase-admin'
import { BuildingBlock } from '../../../../src/types'

export class BlockDao {
    public static async getBlocks(firebaseApp: firebase.app.App, eventId: string): Promise<BuildingBlock[]> {
        const db = firebaseApp.firestore()
        const snapshots = await db.collection(`events/${eventId}/blocks`).get()
        return snapshots.docs.map((doc) => ({
            ...(doc.data() as BuildingBlock),
            id: doc.id,
        }))
    }
}
