import firebase from 'firebase-admin'
import { v4 as uuidv4 } from 'uuid'
import { JobPostType } from '../routes/sponsors/addJobPostPOST'
import { JobStatus, JOB_STATUS_VALUES } from '../../../../src/constants/jobStatus'

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
                status: JobStatus.PENDING,
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
        statusFilter?: string
    ): Promise<JobPostResponse[]> {
        const db = firebaseApp.firestore()
        let query = db
            .collection(`events/${eventId}/jobPosts`)
            .where('sponsorId', '==', sponsorId)
            .orderBy('createdAt', 'desc')

        if (statusFilter && JOB_STATUS_VALUES.includes(statusFilter as JobStatus)) {
            query = query.where('status', '==', statusFilter)
        }

        const snapshot = await query.get()

        return snapshot.docs.map((doc) => doc.data() as JobPostResponse)
    }

    public static async getAllJobPosts(
        firebaseApp: firebase.app.App,
        eventId: string,
        statusFilter?: string
    ): Promise<JobPostResponse[]> {
        const db = firebaseApp.firestore()
        let query = db.collection(`events/${eventId}/jobPosts`).orderBy('createdAt', 'desc')

        if (statusFilter && JOB_STATUS_VALUES.includes(statusFilter as JobStatus)) {
            query = query.where('status', '==', statusFilter)
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

    public static async setJobPostStatus(
        firebaseApp: firebase.app.App,
        eventId: string,
        jobPostId: string,
        status: JobStatus
    ): Promise<boolean> {
        try {
            const db = firebaseApp.firestore()
            await db.collection(`events/${eventId}/jobPosts`).doc(jobPostId).update({
                status,
            })
            return true
        } catch (error) {
            console.error('Error updating job post status:', error)
            return false
        }
    }

    public static async updateJobPost(
        firebaseApp: firebase.app.App,
        eventId: string,
        jobPostId: string,
        updateData: Partial<JobPostData>
    ): Promise<boolean> {
        try {
            const db = firebaseApp.firestore()
            await db
                .collection(`events/${eventId}/jobPosts`)
                .doc(jobPostId)
                .update({
                    ...updateData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                })
            return true
        } catch (error) {
            console.error('Error updating job post:', error)
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
