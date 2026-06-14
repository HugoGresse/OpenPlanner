import { initializeApp } from 'firebase/app'
import { collection, Firestore, getFirestore } from '@firebase/firestore'
import { FirebaseApp } from '@firebase/app'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { Auth } from '@firebase/auth'
import {
    adminUserConverter,
    eventConverter,
    faqConverter,
    jobPostConverter,
    sessionConverter,
    speakerConverter,
    sponsorsConverter,
    teamConverter,
    ticketConverter,
} from './converters'

const config = {
    apiKey: import.meta.env.VITE_FIREBASE_OPEN_PLANNER_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_OPEN_PLANNER_DOMAIN,
    databaseURL: `https://${import.meta.env.VITE_FIREBASE_OPEN_PLANNER_PROJECT_ID}.firebaseio.com`,
    projectId: import.meta.env.VITE_FIREBASE_OPEN_PLANNER_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_OPEN_PLANNER_STORAGE_BUCKET,
    appId: import.meta.env.VITE_FIREBASE_OPEN_PLANNER_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_OPEN_PLANNER_MEASUREMENT_ID,
}

export const baseStorageUrl = `https://storage.googleapis.com/${config.storageBucket}`
export const alternativeStorageUrl = `https://${config.storageBucket}.storage.googleapis.com/`

export const isStorageUrl = (url: string | null | undefined): boolean => {
    if (!url) return false
    return url.startsWith(baseStorageUrl) || url.startsWith(alternativeStorageUrl)
}

// Strip a full public storage URL down to its bucket-relative path. Firebase's
// ref(storage, ...) only understands gs:// or firebasestorage URLs, so a public
// googleapis.com URL must be reduced to a plain path first.
export const storageUrlToPath = (urlOrPath: string): string => {
    if (urlOrPath.startsWith(alternativeStorageUrl)) {
        return urlOrPath.slice(alternativeStorageUrl.length)
    }
    if (urlOrPath.startsWith(`${baseStorageUrl}/`)) {
        return urlOrPath.slice(baseStorageUrl.length + 1)
    }
    return urlOrPath
}

// Build the public URL for a bucket-relative storage path.
export const pathToStorageUrl = (path: string): string => `${alternativeStorageUrl}${path}`

let instanceApp: FirebaseApp = initializeApp(config)
export const instanceFirestore: Firestore = getFirestore(instanceApp)
export const storage = getStorage()

export const collections = {
    events: collection(instanceFirestore, 'events').withConverter(eventConverter),
    sponsors: (eventId: string) =>
        collection(instanceFirestore, 'events', eventId, 'sponsors').withConverter(sponsorsConverter),
    sessions: (eventId: string) =>
        collection(instanceFirestore, 'events', eventId, 'sessions').withConverter(sessionConverter),
    sessionsTemplate: (eventId: string) =>
        collection(instanceFirestore, 'events', eventId, 'sessionsTemplate').withConverter(sessionConverter),
    speakers: (eventId: string) =>
        collection(instanceFirestore, 'events', eventId, 'speakers').withConverter(speakerConverter),
    team: (eventId: string) => collection(instanceFirestore, 'events', eventId, 'team').withConverter(teamConverter),
    tickets: (eventId: string) =>
        collection(instanceFirestore, 'events', eventId, 'tickets').withConverter(ticketConverter),
    faq: (eventId: string) => collection(instanceFirestore, 'events', eventId, 'faq').withConverter(faqConverter),
    jobPosts: (eventId: string) =>
        collection(instanceFirestore, 'events', eventId, 'jobPosts').withConverter(jobPostConverter),

    adminsUsers: collection(instanceFirestore, 'admins', 'users', 'admins').withConverter(adminUserConverter),
}

export const getOpenPlannerAuth = (): Auth => {
    return getAuth(instanceApp)
}
