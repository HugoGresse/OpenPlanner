import { createContext, PropsWithChildren, useCallback, useMemo, useState } from 'react'
import { AppSnackbar, AppSnackbarType } from '../components/AppSnackbar'
import { v4 as uuidv4 } from 'uuid'

interface Notification {
    id: string
    message: string
    type?: AppSnackbarType
    dismissDelay?: number
}

export interface CreateNotificationOption {
    type?: AppSnackbarType
    dismissDelay?: number
}

type NotificationContextType = {
    createNotification: (message: string, options?: CreateNotificationOption) => void
}

const DEFAULT_DISMISS_DELAY = 3000

export const NotificationContext = createContext<NotificationContextType>({
    createNotification: () => {},
})

export const NotificationProvider = ({ children }: PropsWithChildren) => {
    const [notifications, setNotification] = useState<Notification[]>([])

    const createNotification = useCallback(
        (message: string, options?: CreateNotificationOption) =>
            setNotification((notifications) => [
                ...notifications,
                {
                    id: uuidv4(),
                    message,
                    type: options?.type,
                    dismissDelay: options?.dismissDelay,
                },
            ]),
        []
    )

    const contextValue: NotificationContextType = useMemo(
        () => ({
            createNotification,
        }),
        [createNotification]
    )

    const handleCloseSnackbar = (notificationId: string) => {
        setNotification((notifications) => notifications.filter((notification) => notification.id !== notificationId))
    }

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
            {notifications.map((notification, index) => (
                <AppSnackbar
                    key={index}
                    type={notification.type}
                    open={notifications.findIndex((n) => n.id == notification.id) !== -1}
                    onClose={() => handleCloseSnackbar(notification.id)}
                    message={notification.message}
                    autoHideDuration={notification.dismissDelay ?? DEFAULT_DISMISS_DELAY}
                    handleClose={() => handleCloseSnackbar(notification.id)}
                />
            ))}
        </NotificationContext.Provider>
    )
}
