import {
    getAuth,
    GithubAuthProvider,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    TwitterAuthProvider,
    User,
} from 'firebase/auth'
import { conferenceHallFirebaseApp } from './conferenceHallFirebase'
import { useEffect, useState } from 'react'

export const getConferenceHallAuth = () => {
    const app = conferenceHallFirebaseApp
    return getAuth(app)
}

const listenConferenceHallAuth = (listener: (user: User | null) => void) => {
    const auth = getConferenceHallAuth()
    return auth.onAuthStateChanged(listener)
}

export const useConferenceHallUser = () => {
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        return listenConferenceHallAuth((userOrNull) => {
            setUser(userOrNull)
        })
    }, [])

    return user
}

export const logoutConferenceHall = () => {
    return signOut(getConferenceHallAuth())
}

export enum ConferenceHallProviders {
    Google,
    Twitter,
    GitHub,
}

const getProvider = (name: ConferenceHallProviders) => {
    switch (name) {
        default:
        case ConferenceHallProviders.Google:
            return new GoogleAuthProvider()
        case ConferenceHallProviders.GitHub:
            return new GithubAuthProvider()
        case ConferenceHallProviders.Twitter:
            return new TwitterAuthProvider()
    }
}

export const conferenceHallLogin = (providerName: ConferenceHallProviders) => {
    const provider = getProvider(providerName)
    const auth = getConferenceHallAuth()
    auth.useDeviceLanguage()

    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user
            console.log('Google login ok, uid: ', user.uid)
        })
        .catch((error) => {
            console.log('error', error)
            // Handle Errors here.
            const errorCode = error.code
            const errorMessage = error.message
            // The email of the user's account used.
            const email = error.customData.email
            // The AuthCredential type that was used.
            const credential = GoogleAuthProvider.credentialFromError(error)
            // ...
        })
}
