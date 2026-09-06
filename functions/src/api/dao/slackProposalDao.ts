import firebase from 'firebase-admin'
import { Proposal } from '../routes/chat/proposalTools'
import { SlackProposalStatus } from '../routes/slack/slackFormat'

const { FieldValue } = firebase.firestore

export type SlackProposalRecord = {
    id: string
    batchId: string
    proposal: Proposal
    status: SlackProposalStatus
    channel: string
    threadTs: string
    messageTs: string | null
    prompt: string
    model: string
    error?: string
}

const collectionPath = (eventId: string) => `events/${eventId}/slackProposals`

export class SlackProposalDao {
    public static async saveProposals(
        firebaseApp: firebase.app.App,
        eventId: string,
        records: SlackProposalRecord[]
    ): Promise<void> {
        if (records.length === 0) return
        const db = firebaseApp.firestore()
        const batch = db.batch()
        for (const record of records) {
            batch.set(db.collection(collectionPath(eventId)).doc(record.id), {
                ...record,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            })
        }
        await batch.commit()
    }

    public static async getProposal(
        firebaseApp: firebase.app.App,
        eventId: string,
        proposalId: string
    ): Promise<SlackProposalRecord | null> {
        const snapshot = await firebaseApp.firestore().collection(collectionPath(eventId)).doc(proposalId).get()
        return snapshot.exists ? (snapshot.data() as SlackProposalRecord) : null
    }

    public static async listBatch(
        firebaseApp: firebase.app.App,
        eventId: string,
        batchId: string
    ): Promise<SlackProposalRecord[]> {
        const snapshot = await firebaseApp
            .firestore()
            .collection(collectionPath(eventId))
            .where('batchId', '==', batchId)
            .get()
        return snapshot.docs.map((doc) => doc.data() as SlackProposalRecord)
    }

    public static async updateStatus(
        firebaseApp: firebase.app.App,
        eventId: string,
        proposalId: string,
        update: { status: SlackProposalStatus; error?: string }
    ): Promise<void> {
        await firebaseApp
            .firestore()
            .collection(collectionPath(eventId))
            .doc(proposalId)
            .update({ ...update, updatedAt: FieldValue.serverTimestamp() })
    }
}
