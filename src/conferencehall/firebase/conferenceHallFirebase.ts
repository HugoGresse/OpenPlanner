import { initializeApp } from 'firebase/app'
import { collection, CollectionReference, getFirestore } from '@firebase/firestore'

const config = {
    apiKey: import.meta.env.VITE_FIREBASE_CONFERENCE_HALL_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_CONFERENCE_HALL_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_CONFERENCE_HALL_PROJECT_ID,
}

export const conferenceHallFirebaseApp = initializeApp(config, 'conference-hall')
export const conferenceHallFirestore = getFirestore(conferenceHallFirebaseApp)

export const conferenceHallCollections = {
    organizations: collection(conferenceHallFirestore, 'organizations'),
    events: collection(conferenceHallFirestore, 'events'),
    proposals: (eventId: string): CollectionReference =>
        collection(conferenceHallFirestore, 'events', eventId, 'proposals'),
}
