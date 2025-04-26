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
    faq: (eventId: string) => collection(instanceFirestore, 'events', eventId, 'faq').withConverter(faqConverter),
    jobPosts: (eventId: string) =>
        collection(instanceFirestore, 'events', eventId, 'jobPosts').withConverter(jobPostConverter),

    adminsUsers: collection(instanceFirestore, 'admins', 'users', 'admins').withConverter(adminUserConverter),
}

export const getOpenPlannerAuth = (): Auth => {
    return getAuth(instanceApp)
}
