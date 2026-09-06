import firebase from 'firebase-admin'
import { Proposal } from '../routes/chat/proposalTools'
import { SlackProposalStatus } from '../routes/slack/slackFormat'

const { FieldValue } = firebase.firestore

// Which bot posted the card, so decisions update it with the same token.
export type SlackCredentialSource = 'installation' | 'event'

export type SlackProposalRecord = {
    id: string
    batchId: string
    proposal: Proposal
    status: SlackProposalStatus
    credential: SlackCredentialSource
    channel: string
    threadTs: string
    messageTs: string | null
    prompt: string
    model: string
    error?: string
}

export type SlackProposalDecision = { status: SlackProposalStatus; error?: string }

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

    // Atomically moves a pending proposal to 'applying' so concurrent clicks cannot both act on it.
    public static async claimProposal(
        firebaseApp: firebase.app.App,
        eventId: string,
        proposalId: string
    ): Promise<SlackProposalRecord | null> {
        const db = firebaseApp.firestore()
        const ref = db.collection(collectionPath(eventId)).doc(proposalId)
        return db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(ref)
            if (!snapshot.exists) return null
            const record = snapshot.data() as SlackProposalRecord
            if (record.status !== 'pending') return null
            transaction.update(ref, { status: 'applying', updatedAt: FieldValue.serverTimestamp() })
            return record
        })
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
        decision: SlackProposalDecision
    ): Promise<void> {
        await firebaseApp
            .firestore()
            .collection(collectionPath(eventId))
            .doc(proposalId)
            .update({ ...decision, updatedAt: FieldValue.serverTimestamp() })
    }
}
