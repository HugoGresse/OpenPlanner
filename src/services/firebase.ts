import { initializeApp } from 'firebase/app'
import { Firestore, getFirestore } from 'firebase/firestore/lite'
import { FirebaseApp } from '@firebase/app'
import { getAuth } from 'firebase/auth'
import { Auth } from '@firebase/auth'

let instanceApp: FirebaseApp | null = null
let instanceFirestore: Firestore | null = null

const init = () => {
    const config = {
        apiKey: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_AUTH_DOMAIN,
        databaseURL: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_DATABASE_URL,
        projectId: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_STORAGE_BUCKET,
        appId: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_APPID,
        measurementId: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_MEASUREMENT_ID,
    }

    instanceApp = initializeApp(config)
    instanceFirestore = getFirestore(instanceApp)
}

export const getConferenceCenterFirebaseApp = (): FirebaseApp => {
    if (instanceApp) {
        return instanceApp
    }
    init()
    if (!instanceApp) {
        throw new Error('Could not initialize Conference Center Firebase app')
    }
    return instanceApp
}
export const getConferenceCenterFirestore = () => {
    if (instanceFirestore) {
        return instanceFirestore
    }
    init()
    if (!instanceFirestore) {
        throw new Error('Could not initialize Conference Center Firebase app')
    }
    return instanceFirestore
}
export const getConferenceCenterAuth = (): Auth => {
    if (instanceApp) {
        return getAuth(instanceApp)
    }
    try {
        init()
        if (instanceApp) {
            return getAuth(instanceApp)
        } else {
            throw new Error('Firebase app not configure correction')
        }
    } catch (error) {
        console.log('error', error)
        throw error
    }
}
