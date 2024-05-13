import { useEffect } from 'react'

export const useConfirmBrowserClose = (enable: boolean, message: string) => {
    useEffect(() => {
        function beforeUnload(e: BeforeUnloadEvent) {
            if (!enable) return
            e.preventDefault()
            e.returnValue = message
        }

        window.addEventListener('beforeunload', beforeUnload)

        return () => {
            window.removeEventListener('beforeunload', beforeUnload)
        }
    }, [enable])
}
