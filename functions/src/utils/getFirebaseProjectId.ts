import { defineString } from 'firebase-functions/params'

export const getFirebaseProjectId = () => {
    const firebaseProjectIdParam = defineString('G_FIREBASE_PROJECT_ID', {
        description: 'The Firebase project ID',
    })
    return firebaseProjectIdParam.value()
}
