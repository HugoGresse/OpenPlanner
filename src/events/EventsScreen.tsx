import * as React from 'react'
import { logout } from '../auth/authReducer'
import { useAppDispatch } from '../reduxStore'

export const EventsScreen = ({}) => {
    const dispatch = useAppDispatch()
    return <button onClick={() => dispatch(logout())}>Logout</button>
}
