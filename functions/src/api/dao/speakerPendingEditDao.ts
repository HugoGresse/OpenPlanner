import firebase from 'firebase-admin'
import { v4 as uuidv4 } from 'uuid'
import { Speaker } from '../../types'

const { FieldValue } = firebase.firestore

export interface SpeakerPendingEdit {
    id: string
    speakerId: string
    eventId: string
    submittedAt: firebase.firestore.Timestamp
    tokenId: string
    ip?: string | null
    status: 'pending' | 'approved' | 'rejected'
    reviewedBy?: string | null
    reviewedAt?: firebase.firestore.Timestamp | null
    reviewNote?: string | null
    patch: Partial<Speaker>
    baseSnapshot: Partial<Speaker>
}

export class SpeakerPendingEditDao {
    public static async create(
        firebaseApp: firebase.app.App,
        eventId: string,
        params: {
            speakerId: string
            tokenId: string
            ip?: string | null
            patch: Partial<Speaker>
            baseSnapshot: Partial<Speaker>
        }
    ): Promise<string> {
        const db = firebaseApp.firestore()
        const id = uuidv4()
        await db
            .collection(`events/${eventId}/speakerPendingEdits`)
            .doc(id)
            .set({
                id,
                speakerId: params.speakerId,
                eventId,
                tokenId: params.tokenId,
                ip: params.ip || null,
                status: 'pending',
                submittedAt: FieldValue.serverTimestamp(),
                patch: params.patch,
                baseSnapshot: params.baseSnapshot,
            })
        return id
    }

    /**
     * Atomically create a pending edit and mark the originating magic-link
     * token as used in a single Firestore batch. Either both writes land or
     * neither does — closes the gap where a network blip between the two
     * sequential writes could leave a usable token after a successful
     * submit, letting a speaker file duplicate pending edits.
     */
    public static async createAndConsumeToken(
        firebaseApp: firebase.app.App,
        eventId: string,
        params: {
            speakerId: string
            tokenId: string
            ip?: string | null
            patch: Partial<Speaker>
            baseSnapshot: Partial<Speaker>
        }
    ): Promise<string> {
        const db = firebaseApp.firestore()
        const id = uuidv4()
        const pendingRef = db.collection(`events/${eventId}/speakerPendingEdits`).doc(id)
        const tokenRef = db.collection(`events/${eventId}/speakerEditTokens`).doc(params.tokenId)
        const batch = db.batch()
        batch.set(pendingRef, {
            id,
            speakerId: params.speakerId,
            eventId,
            tokenId: params.tokenId,
            ip: params.ip || null,
            status: 'pending',
            submittedAt: FieldValue.serverTimestamp(),
            patch: params.patch,
            baseSnapshot: params.baseSnapshot,
        })
        batch.set(tokenRef, { usedAt: FieldValue.serverTimestamp() }, { merge: true })
        await batch.commit()
        return id
    }

    public static async get(
        firebaseApp: firebase.app.App,
        eventId: string,
        id: string
    ): Promise<SpeakerPendingEdit | null> {
        const db = firebaseApp.firestore()
        const snap = await db.collection(`events/${eventId}/speakerPendingEdits`).doc(id).get()
        if (!snap.exists) return null
        return { id: snap.id, ...snap.data() } as SpeakerPendingEdit
    }

    public static async list(
        firebaseApp: firebase.app.App,
        eventId: string,
        status?: 'pending' | 'approved' | 'rejected'
    ): Promise<SpeakerPendingEdit[]> {
        const db = firebaseApp.firestore()
        let query: FirebaseFirestore.Query = db.collection(`events/${eventId}/speakerPendingEdits`)
        if (status) {
            query = query.where('status', '==', status)
        }
        const snap = await query.get()
        return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SpeakerPendingEdit))
    }

    public static async setReviewed(
        firebaseApp: firebase.app.App,
        eventId: string,
        id: string,
        status: 'approved' | 'rejected',
        reviewerUid: string,
        reviewNote?: string
    ): Promise<void> {
        const db = firebaseApp.firestore()
        await db
            .collection(`events/${eventId}/speakerPendingEdits`)
            .doc(id)
            .set(
                {
                    status,
                    reviewedBy: reviewerUid,
                    reviewedAt: FieldValue.serverTimestamp(),
                    reviewNote: reviewNote || null,
                },
                { merge: true }
            )
    }
}
