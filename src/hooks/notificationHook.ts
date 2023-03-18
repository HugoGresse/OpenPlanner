import { useContext } from 'react'
import { NotificationContext } from '../context/SnackBarProvider'

export const useNotification = () => useContext(NotificationContext)
