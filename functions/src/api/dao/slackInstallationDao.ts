import firebase from 'firebase-admin'

const { FieldValue } = firebase.firestore

export type SlackInstallation = {
    teamId: string
    teamName: string
    botToken: string
    botUserId: string
    installedByUserId: string | null
}

const COLLECTION = 'slackInstallations'

export class SlackInstallationDao {
    public static async getInstallation(
        firebaseApp: firebase.app.App,
        teamId: string
    ): Promise<SlackInstallation | null> {
        const snapshot = await firebaseApp.firestore().collection(COLLECTION).doc(teamId).get()
        return snapshot.exists ? (snapshot.data() as SlackInstallation) : null
    }

    public static async saveInstallation(
        firebaseApp: firebase.app.App,
        installation: SlackInstallation
    ): Promise<void> {
        await firebaseApp
            .firestore()
            .collection(COLLECTION)
            .doc(installation.teamId)
            .set({ ...installation, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    }

    public static async deleteInstallation(firebaseApp: firebase.app.App, teamId: string): Promise<void> {
        await firebaseApp.firestore().collection(COLLECTION).doc(teamId).delete()
    }
}
