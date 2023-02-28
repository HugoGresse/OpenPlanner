import * as React from 'react'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { listenAuthChange, selectIsUserLoggedInToConferenceCenter } from './authReducer'
import { LoginScreen } from './LoginScreen'
import { CircularProgress } from '@mui/material'
import { useAppDispatch } from '../reduxStore'

export type RequireLoginProps = {
    children: React.ReactNode
}
export const RequireLogin = ({ children }: RequireLoginProps) => {
    const dispatch = useAppDispatch()
    const isLoggedIn = useSelector(selectIsUserLoggedInToConferenceCenter)
    const [authInit, setAuthInit] = useState(false)

    useEffect(() => {
        const unsubscribe = dispatch(
            listenAuthChange(() => {
                setAuthInit(true)
            })
        )

        return unsubscribe
    }, [])

    if (!authInit) {
        return <CircularProgress />
    }

    if (isLoggedIn) {
        return <>{children}</>
    }
    return <LoginScreen />
}
