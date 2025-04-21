import firebase from 'firebase-admin'
import { v4 as uuidv4 } from 'uuid'
import { JobPostType } from '../routes/sponsors/addJobPostPOST'

// Define a type for job posts without the privateEventId field
export type JobPostData = Omit<JobPostType, 'addJobPostPrivateId'>

export interface JobPostResponse extends JobPostData {
    id: string
    createdAt: firebase.firestore.Timestamp
}

export class JobPostDao {
    public static async addJobPost(
        firebaseApp: firebase.app.App,
        eventId: string,
        jobPost: JobPostData
    ): Promise<string> {
        const db = firebaseApp.firestore()
        const jobPostId = uuidv4()

        await db
            .collection(`events/${eventId}/jobPosts`)
            .doc(jobPostId)
            .set({
                ...jobPost,
                id: jobPostId,
                approved: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            })

        return jobPostId
    }

    public static async getJobPost(
        firebaseApp: firebase.app.App,
        eventId: string,
        jobPostId: string
    ): Promise<JobPostResponse> {
        const db = firebaseApp.firestore()
        const snapshot = await db.collection(`events/${eventId}/jobPosts`).doc(jobPostId).get()

        if (!snapshot.exists) {
            throw new Error('Job post not found')
        }

        return snapshot.data() as JobPostResponse
    }

    public static async getJobPostsBySponsor(
        firebaseApp: firebase.app.App,
        eventId: string,
        sponsorId: string,
        approvalStatus?: string
    ): Promise<JobPostResponse[]> {
        const db = firebaseApp.firestore()
        let query = db
            .collection(`events/${eventId}/jobPosts`)
            .where('sponsorId', '==', sponsorId)
            .orderBy('createdAt', 'desc')

        if (approvalStatus === 'approved') {
            query = query.where('approved', '==', true)
        } else if (approvalStatus === 'pending') {
            query = query.where('approved', '==', false)
        }

        const snapshot = await query.get()

        return snapshot.docs.map((doc) => doc.data() as JobPostResponse)
    }

    public static async getAllJobPosts(
        firebaseApp: firebase.app.App,
        eventId: string,
        approvalStatus?: string
    ): Promise<JobPostResponse[]> {
        const db = firebaseApp.firestore()
        let query = db.collection(`events/${eventId}/jobPosts`).orderBy('createdAt', 'desc')

        if (approvalStatus === 'approved') {
            query = query.where('approved', '==', true)
        } else if (approvalStatus === 'pending') {
            query = query.where('approved', '==', false)
        }

        const snapshot = await query.get()

        return snapshot.docs.map((doc) => doc.data() as JobPostResponse)
    }

    public static async deleteJobPost(
        firebaseApp: firebase.app.App,
        eventId: string,
        jobPostId: string
    ): Promise<boolean> {
        try {
            const db = firebaseApp.firestore()
            await db.collection(`events/${eventId}/jobPosts`).doc(jobPostId).delete()
            return true
        } catch (error) {
            console.error('Error deleting job post:', error)
            return false
        }
    }

    public static async setJobPostApproval(
        firebaseApp: firebase.app.App,
        eventId: string,
        jobPostId: string,
        approved: boolean
    ): Promise<boolean> {
        try {
            const db = firebaseApp.firestore()
            await db.collection(`events/${eventId}/jobPosts`).doc(jobPostId).update({
                approved,
            })
            return true
        } catch (error) {
            console.error('Error updating job post approval status:', error)
            return false
        }
    }

    public static async trackJobPostClick(
        firebaseApp: firebase.app.App,
        eventId: string,
        jobPostId: string
    ): Promise<boolean> {
        try {
            const db = firebaseApp.firestore()
            await db
                .collection(`events/${eventId}/jobPosts`)
                .doc(jobPostId)
                .update({
                    clickCount: firebase.firestore.FieldValue.increment(1),
                })
            return true
        } catch (error) {
            console.error('Error tracking job post click:', error)
            return false
        }
    }
}
