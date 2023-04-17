import * as React from 'react'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { listenAuthChange, selectIsUserLoggedInToOpenPlanner } from './authReducer'
import { LoginScreen } from './LoginScreen'
import { Box, CircularProgress } from '@mui/material'
import { useAppDispatch } from '../reduxStore'

export type RequireLoginProps = {
    children: React.ReactNode
}
export const RequireLogin = ({ children }: RequireLoginProps) => {
    const dispatch = useAppDispatch()
    const isLoggedIn = useSelector(selectIsUserLoggedInToOpenPlanner)
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
        return (
            <Box display="flex" alignItems="center" justifyContent="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        )
    }

    if (isLoggedIn) {
        return <>{children}</>
    }
    return <LoginScreen />
}
