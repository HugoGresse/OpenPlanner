import {signOut, GoogleAuthProvider, getAuth, User, signInWithPopup} from "firebase/auth"
import {getConferenceHallFirebaseApp} from './initConferenceHall'
import {FirebaseOptions} from '@firebase/app'


export const getConferenceHallAuth = (config: FirebaseOptions) => {
    const app = getConferenceHallFirebaseApp(config)
    return getAuth(app)
}

export const listenConferenceHallAuth = (config: FirebaseOptions, listener: (user: User | null) => void) => {
    const auth = getConferenceHallAuth(config)
    auth.onAuthStateChanged(listener)
}

export const logoutConferenceHall = (config: FirebaseOptions) => {
    return signOut(getConferenceHallAuth(config))
}


export const conferenceHallGoogleLogin = (config: FirebaseOptions,) => {
    const provider = new GoogleAuthProvider()
    const auth = getConferenceHallAuth(config)
    auth.useDeviceLanguage()

    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user
            console.log("Google login ok, uid: ", user.uid)
        }).catch((error) => {
            console.log("error", error)
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
