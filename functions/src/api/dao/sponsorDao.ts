import firebase from 'firebase-admin'
import { SponsorType } from '../routes/sponsors/sponsors'
import { SponsorResponse } from '../../types'
import { v4 as uuidv4 } from 'uuid'
import { SponsorCategory } from '../../../../src/types'
import { Sponsor } from '../../../../src/types'

const { FieldValue } = firebase.firestore

export class SponsorDao {
    public static async addSponsor(firebaseApp: firebase.app.App, eventId: string, sponsor: SponsorType): Promise<any> {
        const db = firebaseApp.firestore()

        // 1. Check if the category is not created
        const categorySnapshot = await db.collection(`events/${eventId}/sponsors`).doc(sponsor.categoryId).get()
        const categoryData = categorySnapshot.data()
        if (!categoryData) {
            // Create category on the fly
            await db.collection(`events/${eventId}/sponsors`).doc(sponsor.categoryId).set({
                name: sponsor.categoryName,
                sponsors: [],
            })
        }

        const sponsorId = uuidv4()

        await db
            .collection(`events/${eventId}/sponsors/`)
            .doc(sponsor.categoryId)
            .update({
                sponsors: FieldValue.arrayUnion({
                    id: sponsorId,
                    name: sponsor.name,
                    logoUrl: sponsor.logoUrl || '',
                    website: sponsor.website,
                }),
            })

        return sponsorId
    }

    public static async getSponsor(
        firebaseApp: firebase.app.App,
        eventId: string,
        categoryId: string,
        sponsorId: string
    ): Promise<SponsorResponse> {
        const db = firebaseApp.firestore()

        const snapshot = await db.collection(`events/${eventId}/sponsors/`).doc(categoryId).get()

        if (!snapshot.exists) {
            throw new Error('Sponsor not found')
        }

        const sponsors = snapshot.data()?.sponsors as SponsorResponse[]
        return sponsors.find((sponsor) => sponsor.id === sponsorId) as SponsorResponse
    }

    public static async getSponsors(firebaseApp: firebase.app.App, eventId: string): Promise<SponsorCategory[]> {
        const db = firebaseApp.firestore()
        const snapshot = await db.collection(`events/${eventId}/sponsors`).get()
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as SponsorCategory[]
    }

    public static async findSponsorByToken(
        firebaseApp: firebase.app.App,
        eventId: string,
        token: string
    ): Promise<{ sponsor: Sponsor; categoryId: string } | null> {
        const db = firebaseApp.firestore()
        const snapshot = await db.collection(`events/${eventId}/sponsors`).get()

        for (const doc of snapshot.docs) {
            const categoryData = doc.data() as SponsorCategory
            const sponsor = categoryData.sponsors?.find((s: Sponsor) => s.jobPostToken === token)
            if (sponsor) {
                return { sponsor, categoryId: doc.id }
            }
        }

        return null
    }

    public static async generateTokenForSponsor(
        firebaseApp: firebase.app.App,
        eventId: string,
        categoryId: string,
        sponsorId: string
    ): Promise<string> {
        const db = firebaseApp.firestore()
        const token = uuidv4()

        // Get the category document
        const categoryDoc = await db.collection(`events/${eventId}/sponsors`).doc(categoryId).get()
        if (!categoryDoc.exists) {
            throw new Error('Sponsor category not found')
        }

        const categoryData = categoryDoc.data() as SponsorCategory
        const updatedSponsors = categoryData.sponsors?.map((sponsor: Sponsor) => {
            if (sponsor.id === sponsorId) {
                return { ...sponsor, jobPostToken: token }
            }
            return sponsor
        })

        await db.collection(`events/${eventId}/sponsors`).doc(categoryId).update({
            sponsors: updatedSponsors,
        })

        return token
    }
}
