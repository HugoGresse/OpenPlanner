import { useEffect, useState } from 'react'
import { ConferenceHallEvent, getConferenceHallEvents } from './conferencehall/getConferenceHallEvents'
import {
    conferenceHallGoogleLogin,
    listenConferenceHallAuth,
    logoutConferenceHall,
} from './conferencehall/authConferenceHall'
import { FirebaseOptions } from '@firebase/app'

const ENV: FirebaseOptions = {
    apiKey: import.meta.env.VITE_FIREBASE_CONFERENCE_HALL_API_KEY,
    projectId: import.meta.env.VITE_FIREBASE_CONFERENCE_HALL_PROJECT_ID,
    authDomain: import.meta.env.VITE_FIREBASE_CONFERENCE_HALL_DOMAIN,
}

function ConferenceHallEvents() {
    const [eventList, setEventList] = useState<string[]>([])
    const [isCHLogin, setIsCHLogin] = useState(false)
    const [conferenceHallEvents, setConferenceHallEvents] = useState<ConferenceHallEvent[]>([])

    useEffect(() => {
        listenConferenceHallAuth(ENV, (user) => {
            if (user) {
                console.log('Auth changed, user: ', user.uid)
                setIsCHLogin(true)
                setEventList([...eventList, 'ConferenceHall Logged In'])
            } else {
                setEventList([...eventList, 'ConferenceHall Login but no user'])
            }

            getConferenceHallEvents(ENV).then((events) => {
                setConferenceHallEvents(events)
            })
        })
    }, [])

    return (
        <div className="App">
            <div className="card">
                {isCHLogin ? (
                    'Conference Hall Logged In'
                ) : (
                    <button
                        onClick={() => {
                            conferenceHallGoogleLogin(ENV)
                        }}>
                        Login in Conference Hall
                    </button>
                )}

                {isCHLogin && (
                    <button
                        onClick={() => {
                            logoutConferenceHall(ENV)
                                .then(() => {
                                    setIsCHLogin(false)
                                })
                                .catch((error) => {
                                    console.log('Failed to log out', error)
                                })
                        }}>
                        Logout
                    </button>
                )}

                <br />
                <br />
                <br />
                {isCHLogin && (
                    <button
                        onClick={() => {
                            getConferenceHallEvents(ENV).then((data: any) => {
                                console.log(data)
                            })
                        }}>
                        Get Conference Hall Events
                    </button>
                )}

                {conferenceHallEvents.length > 0 && (
                    <ul>
                        {conferenceHallEvents.map((e) => (
                            <li key={e.id}>{e.name}</li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

export default ConferenceHallEvents
