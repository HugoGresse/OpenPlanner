import { initializeApp } from 'firebase/app'
import { collection, Firestore, getFirestore } from '@firebase/firestore'
import { FirebaseApp } from '@firebase/app'
import { getAuth } from 'firebase/auth'
import { Auth } from '@firebase/auth'
import { eventConverter } from './converters'

const config = {
    apiKey: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_DOMAIN,
    // databaseURL: `https://${import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_PROJECT_ID}.firebaseio.com`,
    projectId: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_STORAGE_BUCKET,
    appId: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_MEASUREMENT_ID,
}

let instanceApp: FirebaseApp = initializeApp(config)
export const instanceFirestore: Firestore = getFirestore(instanceApp)

export const collections = {
    events: collection(instanceFirestore, 'events').withConverter(eventConverter),
    sponsors: collection(instanceFirestore, 'sponsors'),
    sessions: collection(instanceFirestore, 'sessions'),
    speakers: collection(instanceFirestore, 'speakers'),
}

export const getConferenceCenterFirebaseApp = (): FirebaseApp => {
    return instanceApp
}
export const getConferenceCenterFirestore = () => {
    return instanceFirestore
}
export const getConferenceCenterAuth = (): Auth => {
    return getAuth(instanceApp)
}
