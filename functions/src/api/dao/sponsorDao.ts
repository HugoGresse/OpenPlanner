import firebase from 'firebase-admin'
import { SponsorType } from '../routes/sponsors/sponsors'
import { SponsorResponse } from '../../types'
import { v4 as uuidv4 } from 'uuid'

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
}
