import * as React from 'react'
import { useSelector } from 'react-redux'
import { selectIsUserLoggedInToConferenceCenter } from './authReducer'
import { LoginScreen } from './LoginScreen'

export type RequireLoginProps = {
    children: React.ReactNode
}
export const RequireLogin = ({ children }: RequireLoginProps) => {
    const isLoggedIn = useSelector(selectIsUserLoggedInToConferenceCenter)

    if (isLoggedIn) {
        return <>{children}</>
    }
    return <LoginScreen />
}
