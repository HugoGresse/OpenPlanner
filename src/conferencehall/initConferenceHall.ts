import { initializeApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore/lite';
import {FirebaseApp, FirebaseOptions} from '@firebase/app'

let instanceApp : FirebaseApp | null = null;
let instanceFirestore : Firestore | null = null;

const init = (config: FirebaseOptions) => {
    instanceApp = initializeApp(config, "conference-hall");
    instanceFirestore = getFirestore(instanceApp);
}

export const getConferenceHallFirebaseApp = (config: FirebaseOptions): FirebaseApp => {
    if(instanceApp) {
        return instanceApp
    }
    init(config)
    if(!instanceApp) {
        throw new Error("Could not initialize Conference Hall Firebase app")
    }
    return instanceApp;
}
export const getConferenceHallFirestore = (config: FirebaseOptions) => {
    if(instanceFirestore) {
        return instanceFirestore
    }
    init(config)
    if(!instanceFirestore) {
        throw new Error("Could not initialize Conference Hall Firebase app")
    }
    return instanceFirestore;
}
