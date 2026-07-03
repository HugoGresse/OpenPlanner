import { useEffect, useRef } from 'react'

/**
 * Requests a screen wake lock so the display stays on while the component is mounted.
 * The lock is automatically released when the component unmounts or when the page
 * becomes hidden, and re-acquired when the page becomes visible again.
 */
export const useWakeLock = () => {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null)

    useEffect(() => {
        if (!('wakeLock' in navigator)) return

        const acquire = async () => {
            try {
                wakeLockRef.current = await navigator.wakeLock.request('screen')
            } catch {
                // Wake lock request may fail if the document is not visible or the
                // browser / OS denies the request. Fail silently.
            }
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                acquire()
            }
        }

        acquire()
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            wakeLockRef.current?.release()
            wakeLockRef.current = null
        }
    }, [])
}
