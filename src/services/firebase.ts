import { initializeApp } from 'firebase/app'
import { collection, Firestore, getFirestore } from '@firebase/firestore'
import { FirebaseApp } from '@firebase/app'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { Auth } from '@firebase/auth'
import { eventConverter, sessionConverter, speakerConverter, sponsorsConverter } from './converters'

const config = {
    apiKey: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_DOMAIN,
    databaseURL: `https://${import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_PROJECT_ID}.firebaseio.com`,
    projectId: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_STORAGE_BUCKET,
    appId: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_CONFERENCE_CENTER_MEASUREMENT_ID,
}

export const storageBucket = config.storageBucket

let instanceApp: FirebaseApp = initializeApp(config)
export const instanceFirestore: Firestore = getFirestore(instanceApp)
export const storage = getStorage()

export const collections = {
    events: collection(instanceFirestore, 'events').withConverter(eventConverter),
    sponsors: (eventId: string) =>
        collection(instanceFirestore, 'events', eventId, 'sponsors').withConverter(sponsorsConverter),
    sessions: (eventId: string) =>
        collection(instanceFirestore, 'events', eventId, 'sessions').withConverter(sessionConverter),
    speakers: (eventId: string) =>
        collection(instanceFirestore, 'events', eventId, 'speakers').withConverter(speakerConverter),
}

export const getConferenceCenterAuth = (): Auth => {
    return getAuth(instanceApp)
}
